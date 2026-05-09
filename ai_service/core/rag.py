from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Iterable, Protocol

import httpx

from ai_service.core.config import settings
from ai_service.core.errors import ServiceError
from ai_service.core.models import RagChunk, RagSearchResponse, build_trace_id, sha256_like


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
        sql = f"""
            SELECT
                CONCAT('chk_', chunk.id) AS chunk_id,
                source.source_type,
                source.source_id,
                source.title,
                source.url,
                chunk.chunk_text,
                chunk.metadata,
                1 - (chunk.embedding <=> %s::vector) AS score
            FROM {self.chunk_table} AS chunk
            INNER JOIN {self.source_table} AS source
                ON source.id = chunk.source_id
            WHERE chunk.is_active = TRUE
              AND source.is_active = TRUE
              AND chunk.embedding IS NOT NULL
            ORDER BY chunk.embedding <=> %s::vector, chunk.id ASC
            LIMIT %s
        """
        with self._connect() as connection:
            with connection.cursor() as cursor:
                vector_literal = _format_vector(query_embedding)
                cursor.execute(sql, (vector_literal, vector_literal, min(limit, settings.rag_candidate_limit)))
                rows = cursor.fetchall()
            connection.commit()
        return list(rows)

    def _insert_chunks(self, article_id: int, chunks: list[dict[str, Any]], embeddings: list[list[float]], trace_id: str) -> None:
        sql_select_source = f"""
            SELECT id
            FROM {self.source_table}
            WHERE source_type = %s AND source_id = %s
        """
        sql_insert_source = f"""
            INSERT INTO {self.source_table} (
                source_type,
                source_id,
                title,
                url,
                content_hash,
                is_active,
                last_indexed_at,
                created_at,
                updated_at
            ) VALUES (%s, %s, %s, %s, %s, TRUE, NOW(), NOW(), NOW())
            RETURNING id
        """
        sql_update_source = f"""
            UPDATE {self.source_table}
            SET title = %s,
                url = %s,
                content_hash = %s,
                is_active = TRUE,
                last_indexed_at = NOW(),
                updated_at = NOW()
            WHERE id = %s
        """
        sql_delete_chunks = f"""
            DELETE FROM {self.chunk_table}
            WHERE source_id = %s
        """
        sql_insert_chunk = f"""
            INSERT INTO {self.chunk_table} (
                source_id,
                chunk_index,
                chunk_text,
                chunk_hash,
                embedding,
                embedding_model,
                embedding_dimensions,
                metadata,
                is_active,
                created_at,
                updated_at
            ) VALUES (%s, %s, %s, %s, %s::vector, %s, %s, %s, TRUE, NOW(), NOW())
        """
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql_select_source, (settings.rag_source_type, article_id))
                existing_source = cursor.fetchone()
                title = chunks[0]["title"]
                url = chunks[0]["url"]
                content_hash = sha256_like("|".join([str(article_id), title, url, *(chunk["text"] for chunk in chunks)]))
                if existing_source:
                    source_pk = int(existing_source["id"])
                    cursor.execute(sql_update_source, (title, url, content_hash, source_pk))
                else:
                    cursor.execute(
                        sql_insert_source,
                        (settings.rag_source_type, article_id, title, url, content_hash),
                    )
                    created_source = cursor.fetchone()
                    source_pk = int(created_source["id"])

                cursor.execute(sql_delete_chunks, (source_pk,))
                for chunk, embedding in zip(chunks, embeddings, strict=True):
                    metadata = dict(chunk.get("metadata") or {})
                    metadata.update({"trace_id": trace_id, "indexer": "pgvector"})
                    cursor.execute(
                        sql_insert_chunk,
                        (
                            source_pk,
                            _coerce_int(metadata.get("chunk_index"), 0),
                            chunk["text"],
                            sha256_like("|".join([chunk["chunk_id"], chunk["text"], chunk["title"], chunk["url"]])),
                            _format_vector(embedding),
                            settings.siliconflow_embedding_model,
                            settings.rag_embedding_dimensions,
                            json.dumps(metadata, ensure_ascii=False),
                        ),
                    )
            connection.commit()

    def search(self, query: str, limit: int, trace_id: str, payload: dict[str, Any]) -> RagSearchResponse:
        embedding_client = SiliconFlowClient()
        try:
            query_embedding = embedding_client.embed_texts([query])[0]
            rows = self._search_candidates(query_embedding, max(1, limit))
            if not rows:
                return _build_mock_chunks(query=query, limit=limit, trace_id=trace_id)

            documents = [str(row["chunk_text"]) for row in rows]
            reranked_rows = rows
            rerank_scores: dict[int, float] = {}
            if settings.rag_enable_rerank and len(rows) > 1:
                rerank_results = embedding_client.rerank(query=query, documents=documents, top_n=min(len(rows), limit))
                ordered_rows: list[dict[str, Any]] = []
                for result in rerank_results:
                    index = _coerce_int(result.get("index"), -1)
                    if 0 <= index < len(rows):
                        rerank_scores[index] = float(result.get("relevance_score") or 0.0)
                        ordered_rows.append(rows[index])
                if ordered_rows:
                    reranked_rows = ordered_rows

            chunks: list[RagChunk] = []
            for index, row in enumerate(reranked_rows[:limit]):
                metadata = row.get("metadata") or {}
                if isinstance(metadata, str):
                    try:
                        metadata = json.loads(metadata)
                    except Exception:
                        metadata = {"raw_metadata": metadata}
                score = float(row.get("score") or 0.0)
                original_index = next(
                    (candidate_index for candidate_index, candidate_row in enumerate(rows) if candidate_row["chunk_id"] == row["chunk_id"]),
                    index,
                )
                score = rerank_scores.get(original_index, score)
                chunks.append(
                    RagChunk(
                        chunk_id=str(row["chunk_id"]),
                        source_type=str(row["source_type"]),
                        source_id=_coerce_int(row["source_id"], 0),
                        title=str(row["title"]),
                        url=str(row["url"]),
                        text=str(row["chunk_text"]),
                        score=round(score, 4),
                        metadata={
                            **(metadata if isinstance(metadata, dict) else {}),
                            "provider": "siliconflow",
                            "retrieval_mode": "pgvector",
                            "trace_id": trace_id,
                            "rank": index,
                        },
                    )
                )
            return RagSearchResponse(rag_schema_version="v1", query=query, chunks=chunks)
        finally:
            embedding_client.close()

    def reindex_article(self, article_id: int, trace_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        chunks = _build_source_chunks(
            article_id=article_id,
            payload=payload,
            chunk_size=settings.rag_index_chunk_size,
            overlap=settings.rag_index_chunk_overlap,
        )
        if not chunks:
            return {
                "trace_id": trace_id,
                "provider": "siliconflow",
                "model": settings.ai_model,
                "article_id": article_id,
                "status": "accepted",
                "job_id": f"rag_reindex_{article_id}",
                "chunk_count": 0,
            }

        embedding_client = SiliconFlowClient()
        try:
            embeddings = embedding_client.embed_texts([chunk["text"] for chunk in chunks])
            if len(embeddings) != len(chunks):
                raise ServiceError(
                    status_code=502,
                    code="rag_embedding_count_mismatch",
                    message="Embedding 结果数量与切片数量不一致",
                )
            self._insert_chunks(article_id=article_id, chunks=chunks, embeddings=embeddings, trace_id=trace_id)
            return {
                "trace_id": trace_id,
                "provider": "siliconflow",
                "model": settings.ai_model,
                "article_id": article_id,
                "status": "accepted",
                "job_id": f"rag_reindex_{article_id}",
                "chunk_count": len(chunks),
            }
        finally:
            embedding_client.close()


@dataclass
class RagService:
    backend: RagBackend
    fallback_backend: RagBackend | None = None

    def search_rag(self, payload: dict[str, Any], trace_id: str) -> RagSearchResponse:
        query = _normalize_text(payload.get("query"), "")
        if not query:
            raise ServiceError(
                status_code=422,
                code="missing_query",
                message="请求体缺少 query",
                details={"field": "query"},
            )
        limit = min(_coerce_int(payload.get("limit"), settings.rag_default_limit), settings.rag_candidate_limit)
        try:
            return self.backend.search(query=query, limit=max(1, limit), trace_id=trace_id, payload=payload)
        except ServiceError:
            if self.fallback_backend is None:
                raise
        except Exception:
            if self.fallback_backend is None:
                raise
        return self.fallback_backend.search(query=query, limit=max(1, limit), trace_id=trace_id, payload=payload)

    def reindex_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        try:
            return self.backend.reindex_article(article_id=article_id, trace_id=trace_id, payload=payload)
        except ServiceError:
            if self.fallback_backend is None:
                raise
        except Exception:
            if self.fallback_backend is None:
                raise
        return self.fallback_backend.reindex_article(article_id=article_id, trace_id=trace_id, payload=payload)


def build_rag_service() -> RagService:
    if settings.rag_force_mock or settings.rag_provider == "mock":
        mock = _build_mock_backend()
        return RagService(backend=mock, fallback_backend=mock)

    if settings.normalized_provider == "siliconflow" and settings.rag_provider in {"auto", "pgvector", "siliconflow"}:
        real_backend = PgvectorRagBackend()
        mock_backend = _build_mock_backend()
        return RagService(backend=real_backend, fallback_backend=mock_backend)

    mock_backend = _build_mock_backend()
    return RagService(backend=mock_backend, fallback_backend=mock_backend)


class _MockRagBackend:
    def search(self, query: str, limit: int, trace_id: str, payload: dict[str, Any]) -> RagSearchResponse:
        return _build_mock_chunks(query=query, limit=limit, trace_id=trace_id)

    def reindex_article(self, article_id: int, trace_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "trace_id": trace_id,
            "provider": "mock",
            "model": settings.ai_model,
            "article_id": article_id,
            "status": "accepted",
            "job_id": f"rag_reindex_{article_id}",
            "chunk_count": len(
                _build_source_chunks(
                    article_id=article_id,
                    payload=payload,
                    chunk_size=settings.rag_index_chunk_size,
                    overlap=settings.rag_index_chunk_overlap,
                )
            ),
        }


def _build_mock_backend() -> RagBackend:
    return _MockRagBackend()
