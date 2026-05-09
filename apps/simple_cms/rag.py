from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass
from html import unescape
from typing import Iterable

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from pgvector.django import CosineDistance

from apps.simple_cms.models import Article, KnowledgeChunk, KnowledgeSource


SOURCE_TYPE_ARTICLE = "article"


@dataclass(frozen=True)
class IndexedChunk:
    chunk_index: int
    chunk_text: str
    chunk_hash: str
    embedding: list[float]
    metadata: dict[str, object]


def _strip_html(value: str) -> str:
    no_tags = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", unescape(no_tags)).strip()


def _tiptap_to_text(node: object) -> str:
    if isinstance(node, dict):
        parts: list[str] = []
        if node.get("type") == "text":
            parts.append(str(node.get("text", "")))
        for child in node.get("content", []) or []:
            child_text = _tiptap_to_text(child)
            if child_text:
                parts.append(child_text)
        return " ".join(parts).strip()
    if isinstance(node, list):
        return " ".join(filter(None, (_tiptap_to_text(item) for item in node))).strip()
    return ""


def normalize_article_text(article: Article) -> str:
    parts = [
        article.title.strip(),
        article.meta_description.strip(),
        _strip_html(article.content_html),
        _tiptap_to_text(article.content_json),
        _strip_html(article.body),
    ]
    if article.category_id and article.category:
        parts.append(article.category.name.strip())
    tags = list(article.tags.values_list("name", flat=True))
    if tags:
        parts.append(" ".join(tags))
    text = "\n".join(part for part in parts if part)
    return re.sub(r"\n{2,}", "\n", text).strip()


def build_source_url(article: Article) -> str:
    return article.get_absolute_url()


def build_source_hash(article: Article, text: str) -> str:
    payload = {
        "title": article.title,
        "url": build_source_url(article),
        "status": article.status,
        "publish_date": article.publish_date.isoformat() if article.publish_date else None,
        "text": text,
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return f"sha256:{hashlib.sha256(encoded).hexdigest()}"


def chunk_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    size = chunk_size or settings.RAG_CHUNK_SIZE
    step_overlap = overlap if overlap is not None else settings.RAG_CHUNK_OVERLAP
    if not text.strip():
        return []

    paragraphs = [segment.strip() for segment in re.split(r"[\n。！？!?]+", text) if segment.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        candidate = f"{current} {paragraph}".strip() if current else paragraph
        if len(candidate) <= size:
            current = candidate
            continue
        if current:
            chunks.append(current)
        if len(paragraph) <= size:
            current = paragraph
            continue
        start = 0
        step = max(size - step_overlap, 1)
        while start < len(paragraph):
            piece = paragraph[start : start + size].strip()
            if piece:
                chunks.append(piece)
            start += step
        current = ""
    if current:
        chunks.append(current)
    return chunks


def deterministic_embedding(text: str, dimensions: int | None = None) -> list[float]:
    dims = dimensions or settings.RAG_VECTOR_DIMENSIONS
    values = [0.0] * dims
    if not text.strip():
        return values

    for index, token in enumerate(re.findall(r"\w+|[\u4e00-\u9fff]", text.lower())):
        digest = hashlib.sha256(f"{index}:{token}".encode("utf-8")).digest()
        bucket = int.from_bytes(digest[:2], "big") % dims
        sign = 1.0 if digest[2] % 2 == 0 else -1.0
        magnitude = (digest[3] / 255.0) + 0.1
        values[bucket] += sign * magnitude

    norm = math.sqrt(sum(value * value for value in values))
    if norm == 0:
        return values
    return [value / norm for value in values]


def build_indexed_chunks(article: Article) -> list[IndexedChunk]:
    text = normalize_article_text(article)
    chunks = chunk_text(text)
    indexed_chunks: list[IndexedChunk] = []
    for chunk_index, chunk in enumerate(chunks):
        indexed_chunks.append(
            IndexedChunk(
                chunk_index=chunk_index,
                chunk_text=chunk,
                chunk_hash=f"sha256:{hashlib.sha256(chunk.encode('utf-8')).hexdigest()}",
                embedding=deterministic_embedding(chunk),
                metadata={
                    "source_type": SOURCE_TYPE_ARTICLE,
                    "source_id": article.id,
                    "article_status": article.status,
                    "is_published": article.status == "published",
                    "publish_date": article.publish_date.isoformat() if article.publish_date else None,
                },
            )
        )
    return indexed_chunks


@transaction.atomic
def rebuild_article_index(article: Article, dry_run: bool = False) -> dict[str, object]:
    text = normalize_article_text(article)
    content_hash = build_source_hash(article, text)
    indexed_chunks = build_indexed_chunks(article)
    result = {
        "source_type": SOURCE_TYPE_ARTICLE,
        "source_id": article.id,
        "title": article.title,
        "url": build_source_url(article),
        "content_hash": content_hash,
        "chunk_count": len(indexed_chunks),
        "status": article.status,
        "dry_run": dry_run,
    }
    if dry_run:
        return result

    source, _ = KnowledgeSource.objects.update_or_create(
        source_type=SOURCE_TYPE_ARTICLE,
        source_id=article.id,
        defaults={
            "title": article.title,
            "url": build_source_url(article),
            "content_hash": content_hash,
            "is_active": True,
            "last_indexed_at": timezone.now(),
        },
    )
    source.chunks.all().delete()
    KnowledgeChunk.objects.bulk_create(
        [
            KnowledgeChunk(
                source=source,
                chunk_index=item.chunk_index,
                chunk_text=item.chunk_text,
                chunk_hash=item.chunk_hash,
                embedding=item.embedding,
                embedding_model="mock-hash-embedding",
                embedding_dimensions=len(item.embedding),
                metadata=item.metadata,
                is_active=True,
            )
            for item in indexed_chunks
        ]
    )
    return result


def rebuild_knowledge_index(source: str = SOURCE_TYPE_ARTICLE, dry_run: bool = False) -> list[dict[str, object]]:
    if source != SOURCE_TYPE_ARTICLE:
        raise ValueError(f"暂不支持的 source 类型: {source}")

    results = []
    queryset = Article.objects.select_related("category").prefetch_related("tags").order_by("id")
    for article in queryset:
        results.append(rebuild_article_index(article=article, dry_run=dry_run))
    return results


def search_knowledge(query: str, limit: int = 5, source_type: str | None = None) -> list[KnowledgeChunk]:
    query_embedding = deterministic_embedding(query)
    queryset = KnowledgeChunk.objects.select_related("source").filter(is_active=True, source__is_active=True)
    if source_type:
        queryset = queryset.filter(source__source_type=source_type)
    return list(queryset.annotate(score=1 - CosineDistance("embedding", query_embedding)).order_by("-score", "id")[:limit])


def serialize_chunks(chunks: Iterable[KnowledgeChunk]) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    for chunk in chunks:
        score = getattr(chunk, "score", None)
        results.append(
            {
                "chunk_id": f"chk_{chunk.id}",
                "source_type": chunk.source.source_type,
                "source_id": chunk.source.source_id,
                "title": chunk.source.title,
                "url": chunk.source.url,
                "text": chunk.chunk_text,
                "score": round(float(score), 6) if score is not None else 0.0,
                "metadata": chunk.metadata,
            }
        )
    return results
