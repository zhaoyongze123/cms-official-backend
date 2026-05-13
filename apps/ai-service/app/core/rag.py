from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Iterable, Protocol

import httpx

from .config import settings
from .errors import ServiceError
from .models import RagChunk, RagSearchResponse, build_trace_id, sha256_like


class RagBackend(Protocol):
    def search(self, query: str, limit: int, trace_id: str, payload: dict[str, Any]) -> RagSearchResponse:
        raise NotImplementedError

    def reindex_article(self, article_id: int, trace_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


def _normalize_text(value: Any, fallback: str = "") -> str:
    if isinstance(value, str):
        text = value.strip()
        if text:
            return text
    return fallback


def _coerce_int(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []
    if len(normalized) <= chunk_size:
        return [normalized]

    chunks: list[str] = []
    start = 0
    step = max(1, chunk_size - overlap)
    while start < len(normalized):
        end = min(len(normalized), start + chunk_size)
        piece = normalized[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(normalized):
            break
        start += step
    return chunks


def _format_vector(values: Iterable[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"


def _chunk_identifier(source_type: str, source_id: int, index: int) -> str:
    return f"chk_{source_type}_{source_id}_{index + 1}"


def _build_mock_chunks(query: str, limit: int, trace_id: str) -> RagSearchResponse:
    chunks = [
        RagChunk(
            chunk_id=f"chk_{index + 1}",
            source_type="article",
            source_id=1000 + index,
            title=f"{query} 相关内容 {index + 1}",
            url=f"/articles/{1000 + index}/",
            text=f"与“{query}”相关的参考内容 {index + 1}。",
            score=round(0.9 - (index * 0.1), 2),
            metadata={"provider": "mock", "trace_id": trace_id},
        )
        for index in range(limit)
    ]
    return RagSearchResponse(rag_schema_version="v1", query=query, chunks=chunks)


def _build_source_chunks(
    article_id: int,
    payload: dict[str, Any],
    chunk_size: int,
    overlap: int,
) -> list[dict[str, Any]]:
    source_type = _normalize_text(payload.get("source_type"), settings.rag_source_type)
    source_id = _coerce_int(payload.get("source_id"), article_id)
    title = _normalize_text(payload.get("title"), f"文章 {article_id}")
    url = _normalize_text(payload.get("url"), f"/articles/{article_id}/")

    explicit_chunks = payload.get("chunks")
    if isinstance(explicit_chunks, list) and explicit_chunks:
        result: list[dict[str, Any]] = []
        for index, item in enumerate(explicit_chunks):
            if not isinstance(item, dict):
                continue
            text = _normalize_text(item.get("text"), "")
            if not text:
                continue
            result.append(
                {
                    "chunk_id": _normalize_text(item.get("chunk_id"), _chunk_identifier(source_type, source_id, index)),
                    "source_type": _normalize_text(item.get("source_type"), source_type),
                    "source_id": _coerce_int(item.get("source_id"), source_id),
                    "title": _normalize_text(item.get("title"), title),
                    "url": _normalize_text(item.get("url"), url),
                    "text": text,
                    "metadata": item.get("metadata") if isinstance(item.get("metadata"), dict) else {},
                }
            )
        if result:
            return result

    source_text = _normalize_text(
        payload.get("content")
        or payload.get("body")
        or payload.get("summary")
        or payload.get("description")
        or "",
        "",
    )
    if not source_text:
        fallback_text = "\n".join(part for part in [title, _normalize_text(payload.get("summary"), "")] if part)
        source_text = fallback_text.strip()

    result = []
    for index, chunk_text in enumerate(_chunk_text(source_text, chunk_size=chunk_size, overlap=overlap)):
        result.append(
            {
                "chunk_id": _chunk_identifier(source_type, source_id, index),
                "source_type": source_type,
                "source_id": source_id,
                "title": title,
                "url": url,
                "text": chunk_text,
                "metadata": {
                    "kind": "article",
                    "article_id": article_id,
                    "chunk_index": index,
                    "trace_id": payload.get("trace_id", build_trace_id()),
                },
            }
        )
    return result


@dataclass(frozen=True)
class RagSearchRequest:
    query: str
    limit: int
    trace_id: str
    payload: dict[str, Any]


class SiliconFlowClient:
    def __init__(self) -> None:
        if not settings.siliconflow_api_key:
            raise ServiceError(
                status_code=503,
                code="siliconflow_api_key_missing",
                message="SiliconFlow API Key 未配置",
            )
        self._client = httpx.Client(
            base_url=settings.siliconflow_base_url.rstrip("/"),
            timeout=httpx.Timeout(30.0, connect=5.0),
            headers={"Authorization": f"Bearer {settings.siliconflow_api_key}"},
        )

    def close(self) -> None:
        self._client.close()

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        response = self._client.post(
            "/embeddings",
            json={
                "model": settings.siliconflow_embedding_model,
                "input": texts if len(texts) > 1 else texts[0],
                "encoding_format": "float",
                "dimensions": settings.rag_embedding_dimensions,
            },
        )
        response.raise_for_status()
        data = response.json()
        rows = data.get("data") or []
        embeddings: list[list[float]] = []
        for row in rows:
            embedding = row.get("embedding")
            if isinstance(embedding, list):
                embeddings.append([float(value) for value in embedding])
        return embeddings

    def rerank(self, query: str, documents: list[str], top_n: int) -> list[dict[str, Any]]:
        response = self._client.post(
            "/rerank",
            json={
                "model": settings.siliconflow_rerank_model,
                "query": query,
                "documents": documents,
                "top_n": top_n,
                "return_documents": True,
            },
        )
        response.raise_for_status()
        data = response.json()
        results = data.get("results") or []
        return [row for row in results if isinstance(row, dict)]


class PgvectorRagBackend:
    def __init__(self) -> None:
        self.chunk_table = settings.rag_chunk_table
        self.source_table = settings.rag_source_table

    def _connect(self):
        if not settings.rag_database_url:
            raise ServiceError(
                status_code=503,
                code="rag_database_not_configured",
                message="RAG 数据库未配置",
            )

        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
        except Exception as exc:  # pragma: no cover - 依赖缺失时直接回退
            raise ServiceError(
                status_code=503,
                code="rag_database_driver_missing",
                message="pgvector 数据库驱动不可用",
            ) from exc

        connection = psycopg2.connect(settings.rag_database_url, cursor_factory=RealDictCursor)
        connection.autocommit = False
        return connection

    def _search_candidates(self, query_embedding: list[float], limit: int) -> list[dict[str, Any]]:
        connection = self._connect()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT
                        c.id,
                        c.source_type,
                        c.source_id,
                        c.title,
                        c.url,
                        c.text,
                        c.embedding <=> %s AS score,
                        c.metadata
                    FROM {self.chunk_table} c
                    WHERE c.embedding IS NOT NULL
                    ORDER BY c.embedding <=> %s
                    LIMIT %s
                    """,
                    (_format_vector(query_embedding), _format_vector(query_embedding), limit),
                )
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        finally:
            connection.close()

    def search(self, query: str, limit: int, trace_id: str, payload: dict[str, Any]) -> RagSearchResponse:
        raise ServiceError(
            status_code=501,
            code="rag_search_not_implemented",
            message="pgvector 检索尚未接入",
            details={"trace_id": trace_id, "query": query},
        )

    def reindex_article(self, article_id: int, trace_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        chunks = _build_source_chunks(
            article_id=article_id,
            payload={**payload, "trace_id": trace_id},
            chunk_size=settings.rag_index_chunk_size,
            overlap=settings.rag_index_chunk_overlap,
        )
        return {
            "trace_id": trace_id,
            "provider": "pgvector",
            "model": settings.ai_model,
            "article_id": article_id,
            "status": "accepted",
            "job_id": f"rag_reindex_{article_id}",
            "chunk_count": len(chunks),
        }


@dataclass
class MockRagBackend:
    def search(self, query: str, limit: int, trace_id: str, payload: dict[str, Any]) -> RagSearchResponse:
        limit = max(1, min(limit, settings.rag_candidate_limit))
        return _build_mock_chunks(query=query, limit=limit, trace_id=trace_id)

    def reindex_article(self, article_id: int, trace_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        chunks = _build_source_chunks(
            article_id=article_id,
            payload={**payload, "trace_id": trace_id},
            chunk_size=settings.rag_index_chunk_size,
            overlap=settings.rag_index_chunk_overlap,
        )
        return {
            "trace_id": trace_id,
            "provider": "mock",
            "model": settings.ai_model,
            "article_id": article_id,
            "status": "accepted",
            "job_id": f"rag_reindex_{article_id}",
            "chunk_count": len(chunks),
        }


@dataclass
class RAGService:
    backend: RagBackend

    def search_rag(self, payload: dict[str, Any], trace_id: str) -> RagSearchResponse:
        query = _normalize_text(payload.get("query"), "")
        if not query:
            raise ServiceError(
                status_code=422,
                code="missing_query",
                message="请求体缺少 query",
                details={"field": "query"},
            )
        limit = _coerce_int(payload.get("limit"), settings.rag_default_limit)
        limit = max(1, min(limit, settings.rag_candidate_limit))
        return self.backend.search(query=query, limit=limit, trace_id=trace_id, payload=payload)

    def reindex_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        return self.backend.reindex_article(article_id=article_id, trace_id=trace_id, payload=payload)


def build_rag_backend() -> RagBackend:
    if settings.rag_force_mock or settings.normalized_provider == "mock" or settings.rag_provider == "mock":
        return MockRagBackend()
    return PgvectorRagBackend()


def build_rag_service() -> RAGService:
    return RAGService(backend=build_rag_backend())

