from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def build_trace_id() -> str:
    return f"trace_{uuid4().hex}"


def build_run_id(prefix: str = "run") -> str:
    return f"{prefix}_{uuid4().hex}"


def build_suggestion_id(prefix: str = "sug") -> str:
    return f"{prefix}_{uuid4().hex}"


def build_patch_id(prefix: str = "patch") -> str:
    return f"{prefix}_{uuid4().hex}"


def sha256_like(text: str) -> str:
    import hashlib

    return f"sha256:{hashlib.sha256(text.encode('utf-8')).hexdigest()}"


@dataclass(frozen=True)
class ErrorPayload:
    code: str
    message: str
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class AiPatch:
    patch_id: str
    patch_schema_version: str
    operation: str
    target_block_id: str
    content_hash: str
    old_text: str | None = None
    new_text: str | None = None
    new_block: dict[str, Any] | None = None
    position: int | None = None
    reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SourceChunk:
    chunk_id: str
    source_type: str
    source_id: int
    title: str
    url: str
    score: float
    text: str | None = None
    metadata: dict[str, Any] | None = None

    def to_suggestion_dict(self) -> dict[str, Any]:
        payload = {
            "chunk_id": self.chunk_id,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "title": self.title,
            "url": self.url,
            "score": self.score,
        }
        return payload

    def to_rag_dict(self) -> dict[str, Any]:
        payload = self.to_suggestion_dict()
        payload["text"] = self.text or ""
        if self.metadata is not None:
            payload["metadata"] = self.metadata
        return payload


@dataclass(frozen=True)
class AiSuggestion:
    suggestion_id: str
    schema_version: str
    article_id: int
    type: str
    status: str
    severity: str
    title: str
    reason: str
    patches: list[AiPatch]
    source_chunks: list[SourceChunk]
    payload: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["patches"] = [patch.to_dict() for patch in self.patches]
        data["source_chunks"] = [chunk.to_suggestion_dict() for chunk in self.source_chunks]
        return data


@dataclass(frozen=True)
class AiReviewRun:
    run_id: str
    schema_version: str
    article_id: int
    status: str
    provider: str
    model: str
    prompt_version: str
    created_at: datetime
    trace_id: str
    token_usage: dict[str, Any] = field(default_factory=dict)
    error: ErrorPayload | None = None
    completed_at: datetime | None = None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["created_at"] = isoformat(self.created_at)
        data["completed_at"] = isoformat(self.completed_at)
        data["error"] = self.error.to_dict() if self.error else None
        return data


@dataclass(frozen=True)
class RagChunk:
    chunk_id: str
    source_type: str
    source_id: int
    title: str
    url: str
    text: str
    score: float
    metadata: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        if self.metadata is None:
            data.pop("metadata")
        return data


@dataclass(frozen=True)
class RagSearchResponse:
    rag_schema_version: str
    query: str
    chunks: list[RagChunk]

    def to_dict(self) -> dict[str, Any]:
        return {
            "rag_schema_version": self.rag_schema_version,
            "query": self.query,
            "chunks": [chunk.to_dict() for chunk in self.chunks],
        }


@dataclass(frozen=True)
class SeoContext:
    seo_context_schema_version: str
    title: str
    description: str
    canonical: str
    robots: str
    og: dict[str, Any]
    twitter: dict[str, Any] | None = None
    json_ld: list[dict[str, Any]] = field(default_factory=list)
    breadcrumbs: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        data = {
            "seo_context_schema_version": self.seo_context_schema_version,
            "title": self.title,
            "description": self.description,
            "canonical": self.canonical,
            "robots": self.robots,
            "og": self.og,
            "json_ld": self.json_ld,
        }
        if self.twitter is not None:
            data["twitter"] = self.twitter
        if self.breadcrumbs:
            data["breadcrumbs"] = self.breadcrumbs
        return data
