from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from ai_service.core.config import settings
from ai_service.core.errors import ServiceError
from ai_service.core.models import AiPatch, AiReviewRun, AiSuggestion, RagChunk, RagSearchResponse, SeoContext, SourceChunk, build_patch_id, build_run_id, build_suggestion_id, build_trace_id, sha256_like, utc_now


class Provider(Protocol):
    name: str

    def review_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> tuple[AiReviewRun, list[AiSuggestion]]:
        raise NotImplementedError

    def generate_metadata(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def generate_faq(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def recommend_internal_links(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def generate_alt(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def reindex_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def search_rag(self, payload: dict[str, Any], trace_id: str) -> RagSearchResponse:
        raise NotImplementedError


def _normalize_text(value: Any, fallback: str) -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


def _build_source_chunks(article_id: int, title: str, url: str, text: str) -> list[SourceChunk]:
    return [
        SourceChunk(
            chunk_id=f"chk_{article_id}_1",
            source_type="article",
            source_id=article_id,
            title=title,
            url=url,
            score=0.97,
            text=text,
            metadata={"kind": "article"},
        )
    ]


def _build_ai_patch(operation: str, target_block_id: str, new_text: str | None = None, old_text: str | None = None, position: int | None = None, reason: str | None = None, new_block: dict[str, Any] | None = None) -> AiPatch:
    return AiPatch(
        patch_id=build_patch_id(),
        patch_schema_version="v1",
        operation=operation,
        target_block_id=target_block_id,
        content_hash=sha256_like("|".join([operation, target_block_id, new_text or "", old_text or "", str(position or ""), reason or ""])),
        old_text=old_text,
        new_text=new_text,
        new_block=new_block,
        position=position,
        reason=reason,
    )


@dataclass
class MockProvider:
    name: str = "mock"

    def review_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> tuple[AiReviewRun, list[AiSuggestion]]:
        title = _normalize_text(payload.get("title"), f"文章 {article_id}")
        summary = _normalize_text(payload.get("summary"), "建议补充可检索关键词与结构化摘要。")
        source_chunks = _build_source_chunks(article_id, title, payload.get("url") or f"/articles/{article_id}/", summary)
        suggestion = AiSuggestion(
            suggestion_id=build_suggestion_id(),
            schema_version="v1",
            article_id=article_id,
            type="metadata",
            status="pending",
            severity="medium",
            title="优化元数据",
            reason="标题或摘要可进一步增强搜索点击意图。",
            patches=[
                _build_ai_patch(
                    operation="replace_text",
                    target_block_id="blk_metadata_title",
                    old_text=payload.get("meta_title") or title,
                    new_text=f"{title} | SEO 优化建议",
                    reason="补充更明确的搜索意图表达。",
                )
            ],
            source_chunks=source_chunks,
            payload={"provider": self.name, "trace_id": trace_id},
        )
        run = AiReviewRun(
            run_id=build_run_id(),
            schema_version="v1",
            article_id=article_id,
            status="completed",
            provider=self.name,
            model=settings.ai_model,
            prompt_version=settings.ai_prompt_version,
            created_at=utc_now(),
            completed_at=utc_now(),
            trace_id=trace_id,
            token_usage={"prompt_tokens": 128, "completion_tokens": 64, "total_tokens": 192},
        )
        return run, [suggestion]

    def generate_metadata(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        title = _normalize_text(payload.get("title"), f"文章 {article_id}")
        description = _normalize_text(payload.get("description"), "这是基于文章内容生成的 SEO 描述。")
        seo_context = SeoContext(
            seo_context_schema_version="v1",
            title=title,
            description=description,
            canonical=_normalize_text(payload.get("canonical"), f"https://example.com/articles/{article_id}"),
            robots=_normalize_text(payload.get("robots"), "index,follow"),
            og={
                "title": title,
                "description": description,
                "image": _normalize_text(payload.get("image"), "https://example.com/og-default.png"),
                "url": _normalize_text(payload.get("url"), f"https://example.com/articles/{article_id}"),
                "type": "article",
            },
            twitter={
                "card": "summary_large_image",
                "title": title,
                "description": description,
                "image": _normalize_text(payload.get("image"), "https://example.com/og-default.png"),
            },
            json_ld=[{"@type": "Article", "headline": title}],
            breadcrumbs=payload.get("breadcrumbs") or [],
        )
        return {"trace_id": trace_id, "provider": self.name, "model": settings.ai_model, "seo_context": seo_context.to_dict()}

    def generate_faq(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        question = _normalize_text(payload.get("question"), "这篇文章的核心问题是什么？")
        answer = _normalize_text(payload.get("answer"), "可根据正文提炼出更具体的问答内容。")
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": settings.ai_model,
            "article_id": article_id,
            "faq": [
                {"question": question, "answer": answer},
            ],
        }

    def recommend_internal_links(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        links = payload.get("candidate_links") or []
        if not links:
            links = [
                {"title": "相关文章", "url": f"/articles/{article_id}/related/", "reason": "补充主题相关度。"},
            ]
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": settings.ai_model,
            "article_id": article_id,
            "links": links,
        }

    def generate_alt(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        image_url = _normalize_text(payload.get("image_url"), "https://example.com/image.png")
        alt_text = _normalize_text(payload.get("alt_text"), "与文章主题相关的说明性图片")
        patch = _build_ai_patch(
            operation="alt_text",
            target_block_id=_normalize_text(payload.get("target_block_id"), "blk_image_1"),
            new_text=alt_text,
            reason="为图片补充可读的替代文本。",
        )
        suggestion = AiSuggestion(
            suggestion_id=build_suggestion_id(),
            schema_version="v1",
            article_id=article_id,
            type="alt_text",
            status="pending",
            severity="low",
            title="生成图片 Alt",
            reason="图片缺少适合检索与可访问性的替代文本。",
            patches=[patch],
            source_chunks=_build_source_chunks(article_id, f"图片 {article_id}", image_url, alt_text),
            payload={"image_url": image_url, "provider": self.name, "trace_id": trace_id},
        )
        return {"trace_id": trace_id, "provider": self.name, "model": settings.ai_model, "suggestion": suggestion.to_dict()}

    def reindex_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": settings.ai_model,
            "article_id": article_id,
            "status": "accepted",
            "job_id": f"rag_reindex_{article_id}",
        }

    def search_rag(self, payload: dict[str, Any], trace_id: str) -> RagSearchResponse:
        query = _normalize_text(payload.get("query"), "未命名查询")
        limit = int(payload.get("limit") or 3)
        chunks = [
            RagChunk(
                chunk_id=f"chk_{index + 1}",
                source_type="article",
                source_id=1000 + index,
                title=f"{query} 相关内容 {index + 1}",
                url=f"/articles/{1000 + index}/",
                text=f"与“{query}”相关的参考内容 {index + 1}。",
                score=round(0.9 - (index * 0.1), 2),
                metadata={"provider": self.name, "trace_id": trace_id},
            )
            for index in range(limit)
        ]
        return RagSearchResponse(rag_schema_version="v1", query=query, chunks=chunks)


@dataclass
class SiliconFlowProvider(MockProvider):
    name: str = "siliconflow"

    def _placeholder_unavailable(self, action: str) -> None:
        raise ServiceError(
            status_code=501,
            code="siliconflow_not_implemented",
            message=f"SiliconFlow Provider 占位实现尚未接入 {action}",
            details={"provider": self.name, "base_url": settings.siliconflow_base_url},
        )

    def review_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> tuple[AiReviewRun, list[AiSuggestion]]:
        self._placeholder_unavailable("review_article")

    def generate_metadata(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        self._placeholder_unavailable("generate_metadata")

    def generate_faq(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        self._placeholder_unavailable("generate_faq")

    def recommend_internal_links(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        self._placeholder_unavailable("recommend_internal_links")

    def generate_alt(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        self._placeholder_unavailable("generate_alt")

    def reindex_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        self._placeholder_unavailable("reindex_article")

    def search_rag(self, payload: dict[str, Any], trace_id: str) -> RagSearchResponse:
        self._placeholder_unavailable("search_rag")


def get_provider() -> Provider:
    if settings.normalized_provider == "siliconflow":
        return SiliconFlowProvider()
    return MockProvider()
