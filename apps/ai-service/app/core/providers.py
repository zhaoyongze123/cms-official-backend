from __future__ import annotations

from dataclasses import dataclass
import json
import logging
from typing import Any, Protocol
import httpx

from .config import settings
from .errors import ServiceError
from .models import AiPatch, AiReviewRun, AiSuggestion, RagSearchResponse, SeoContext, SourceChunk, build_patch_id, build_run_id, build_suggestion_id, build_trace_id, sha256_like, utc_now
from .rag import build_rag_service


logger = logging.getLogger(__name__)


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

    def generate_title(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def generate_slug(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def generate_tags(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def generate_description(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
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


def _truncate_text(value: Any, limit: int) -> str:
    text = _normalize_text(value, "")
    if len(text) <= limit:
        return text
    return f"{text[:limit]}\n...[truncated {len(text) - limit} chars]"


def _normalize_string_list(value: Any, limit: int = 8) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        if isinstance(item, str) and item.strip():
            items.append(item.strip())
        if len(items) >= limit:
            break
    return items


def _build_alt_generation_context(article_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    summary = _normalize_text(
        payload.get("summary") or payload.get("meta_description") or payload.get("description"),
        "",
    )
    compact_content_json = _truncate_text(json.dumps(payload.get("content_json") or {}, ensure_ascii=False), 1200)
    return {
        "article_id": article_id,
        "article_title": _normalize_text(payload.get("title"), f"文章 {article_id}"),
        "article_slug": _normalize_text(payload.get("slug"), ""),
        "article_summary": summary,
        "keywords": _normalize_string_list(payload.get("keywords")),
        "content_html_excerpt": _truncate_text(payload.get("content_html"), 1800),
        "content_json_excerpt": compact_content_json,
        "image_url": _normalize_text(payload.get("image_url"), ""),
        "image_title": _normalize_text(payload.get("image_title"), ""),
        "image_caption": _normalize_text(payload.get("image_caption") or payload.get("caption"), ""),
        "image_context": _normalize_text(payload.get("image_context") or payload.get("vision_summary"), ""),
        "existing_alt_text": _normalize_text(payload.get("alt_text"), ""),
        "target_block_id": _normalize_text(payload.get("target_block_id"), ""),
    }


def _build_alt_text_fallback(article_id: int, payload: dict[str, Any]) -> str:
    context = _build_alt_generation_context(article_id, payload)
    image_focus = next(
        (
            value
            for value in [
                context["image_context"],
                context["image_caption"],
                context["image_title"],
                context["existing_alt_text"],
            ]
            if isinstance(value, str) and value
        ),
        "",
    )
    article_focus = next(
        (
            value
            for value in [
                context["article_title"],
                context["article_summary"],
            ]
            if isinstance(value, str) and value
        ),
        "",
    )
    keywords = context["keywords"] if isinstance(context["keywords"], list) else []
    segments: list[str] = []
    if image_focus:
        segments.append(image_focus)
    if article_focus and article_focus not in segments:
        segments.append(article_focus)
    if keywords and len(segments) < 2:
        keyword_text = "、".join(keywords[:3])
        if keyword_text not in segments:
            segments.append(keyword_text)

    alt_text = "，".join(segment.strip() for segment in segments if isinstance(segment, str) and segment.strip())
    if not alt_text:
        alt_text = "与文章主题相关的说明性图片"
    if len(alt_text) > 80:
        alt_text = alt_text[:77].rstrip("，、；;：: ") + "..."
    return alt_text


def _resolve_model(payload: dict[str, Any]) -> str:
    model = payload.get("model")
    if isinstance(model, str) and model.strip():
        return model.strip()
    return settings.ai_model


def _resolve_prompts(payload: dict[str, Any]) -> dict[str, str]:
    raw_prompts = payload.get("prompts")
    prompts: dict[str, str] = {}
    if isinstance(raw_prompts, dict):
        for key, value in raw_prompts.items():
            if isinstance(key, str) and isinstance(value, str) and value.strip():
                prompts[key] = value.strip()
    return prompts


def _resolve_prompt(payload: dict[str, Any], key: str) -> str | None:
    value = _resolve_prompts(payload).get(key)
    if value:
        return value
    return None


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
            model=_resolve_model(payload),
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
        return {"trace_id": trace_id, "provider": self.name, "model": _resolve_model(payload), "seo_context": seo_context.to_dict()}

    def generate_faq(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        question = _normalize_text(payload.get("question"), "这篇文章的核心问题是什么？")
        answer = _normalize_text(payload.get("answer"), "可根据正文提炼出更具体的问答内容。")
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": _resolve_model(payload),
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
            "model": _resolve_model(payload),
            "article_id": article_id,
            "links": links,
        }

    def generate_alt(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        image_url = _normalize_text(payload.get("image_url"), "https://example.com/image.png")
        alt_text = _build_alt_text_fallback(article_id, payload)
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
        return {"trace_id": trace_id, "provider": self.name, "model": _resolve_model(payload), "suggestion": suggestion.to_dict()}

    def generate_title(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        content_html = _normalize_text(payload.get("content_html"), "")
        keywords = payload.get("keywords", [])
        keywords_str = ", ".join(keywords) if keywords else "AI、人工智能、技术趋势"
        fallback_titles = [
            f"文章 {article_id} — 深度解析与行业洞察",
            f"关于 {keywords_str} 的完整指南",
            f"2024年技术趋势：{keywords_str} 领域最新动态",
        ]
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": _resolve_model(payload),
            "article_id": article_id,
            "titles": [{"text": title, "reason": "基于内容自动生成"} for title in fallback_titles],
        }

    def generate_slug(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        title = _normalize_text(payload.get("title"), f"文章 {article_id}")
        keywords = payload.get("keywords", [])
        keywords_str = "-".join(keywords[:3]) if keywords else "ai-tech"
        fallback_slugs = [
            f"{keywords_str}-guide-{article_id}",
            f"{title[:20]}-{article_id}".lower().replace(" ", "-"),
            f"article-{article_id}-insights",
        ]
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": _resolve_model(payload),
            "article_id": article_id,
            "slugs": [{"text": slug, "reason": "基于内容生成"} for slug in fallback_slugs],
        }

    def generate_tags(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        keywords = payload.get("keywords", [])
        fallback_tags = keywords if keywords else ["AI", "技术趋势", "大模型", "Agent"]
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": _resolve_model(payload),
            "article_id": article_id,
            "tags": [{"name": tag, "reason": "基于内容提取"} for tag in fallback_tags[:10]],
        }

    def generate_description(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        content_html = _normalize_text(payload.get("content_html"), "")
        fallback_desc = f"本文深入分析文章 {article_id} 的核心内容，帮助读者快速了解关键信息。"
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": _resolve_model(payload),
            "article_id": article_id,
            "descriptions": [{"text": fallback_desc, "reason": "基于内容生成"}],
        }

    def reindex_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": _resolve_model(payload),
            "article_id": article_id,
            "status": "accepted",
            "job_id": f"rag_reindex_{article_id}",
        }

    def search_rag(self, payload: dict[str, Any], trace_id: str) -> RagSearchResponse:
        from .rag import MockRagBackend

        backend = MockRagBackend()
        query = _normalize_text(payload.get("query"), "")
        limit_value = payload.get("limit")
        if isinstance(limit_value, int):
            limit = limit_value
        else:
            limit = settings.rag_default_limit
        return backend.search(query=query, limit=limit, trace_id=trace_id, payload=payload)


@dataclass
class SiliconFlowProvider(MockProvider):
    name: str = "siliconflow"

    def _ensure_api_key(self) -> None:
        if settings.siliconflow_api_key.strip():
            return
        raise ServiceError(
            status_code=503,
            code="siliconflow_api_key_missing",
            message="SiliconFlow API Key 未配置",
            details={"provider": self.name},
        )

    def _request_chat_completion(self, prompt: str, trace_id: str, model: str, temperature: float = 0.2) -> str:
        self._ensure_api_key()
        url = f"{settings.siliconflow_base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.siliconflow_api_key}",
            "Content-Type": "application/json",
            "X-Trace-Id": trace_id,
        }
        payload = {
            "model": model,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": "你是 CMS SEO 编辑助手。必须返回合法 JSON，不要输出 JSON 之外的内容。",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        }
        if settings.ai_log_stages:
            logger.info(
                "[ai-stage] siliconflow request start trace_id=%s model=%s temperature=%s prompt_chars=%s",
                trace_id,
                model,
                temperature,
                len(prompt),
            )
        try:
            timeout = httpx.Timeout(
                connect=settings.siliconflow_connect_timeout,
                read=settings.siliconflow_read_timeout,
                write=settings.siliconflow_connect_timeout,
                pool=settings.siliconflow_connect_timeout,
            )
            response = httpx.post(url, headers=headers, json=payload, timeout=timeout)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            if settings.ai_log_stages:
                logger.exception(
                    "[ai-stage] siliconflow request failed trace_id=%s model=%s",
                    trace_id,
                    model,
                )
            raise ServiceError(
                status_code=502,
                code="siliconflow_request_failed",
                message="调用 SiliconFlow 失败",
                details={"provider": self.name, "reason": str(exc)},
            ) from exc

        body = response.json()
        if settings.ai_log_stages:
            logger.info(
                "[ai-stage] siliconflow request done trace_id=%s model=%s status=%s",
                trace_id,
                model,
                response.status_code,
            )
        try:
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ServiceError(
                status_code=502,
                code="siliconflow_invalid_response",
                message="SiliconFlow 返回结构不符合预期",
                details={"provider": self.name},
            ) from exc
        if not isinstance(content, str) or not content.strip():
            raise ServiceError(
                status_code=502,
                code="siliconflow_empty_response",
                message="SiliconFlow 未返回有效内容",
                details={"provider": self.name},
            )
        return content

    def _parse_json_content(self, content: str, action: str) -> dict[str, Any]:
        try:
            payload = json.loads(content)
        except json.JSONDecodeError as exc:
            raise ServiceError(
                status_code=502,
                code="siliconflow_invalid_json",
                message=f"SiliconFlow {action} 返回了非法 JSON",
                details={"provider": self.name},
            ) from exc
        if not isinstance(payload, dict):
            raise ServiceError(
                status_code=502,
                code="siliconflow_invalid_payload",
                message=f"SiliconFlow {action} 返回的 JSON 顶层必须为对象",
                details={"provider": self.name},
            )
        return payload

    def _build_review_prompt(self, article_id: int, payload: dict[str, Any]) -> str:
        title = _normalize_text(payload.get("title"), f"文章 {article_id}")
        summary = _normalize_text(payload.get("summary") or payload.get("meta_description"), "")
        content_html = _truncate_text(payload.get("content_html"), 6000)
        content_json = payload.get("content_json") or {}
        compact_content_json = _truncate_text(json.dumps(content_json, ensure_ascii=False), 3000)
        custom_prompt = _resolve_prompt(payload, "review_prompt")
        if custom_prompt:
            return (
                f"{custom_prompt}\n"
                f"article_id={article_id}\n"
                f"title={title}\n"
                f"summary={summary}\n"
                f"content_html={content_html}\n"
                f"content_json={compact_content_json}"
            )
        return (
            "请基于以下文章内容给出 1-3 条 SEO 编辑建议，输出 JSON 对象，字段必须包含 "
            "`suggestions` 数组。每条 suggestion 必须包含 `type`、`severity`、`title`、`reason`、`patches`。"
            "patch 必须包含 `operation`、`target_block_id`、`new_text`，可选 `old_text`、`reason`。"
            "优先生成 metadata 或 body_replace 建议。\n"
            f"article_id={article_id}\n"
            f"title={title}\n"
            f"summary={summary}\n"
            f"content_html={content_html}\n"
            f"content_json={compact_content_json}"
        )

    def _build_metadata_prompt(self, article_id: int, payload: dict[str, Any]) -> str:
        title = _normalize_text(payload.get("title"), f"文章 {article_id}")
        description = _normalize_text(payload.get("description") or payload.get("summary"), "")
        slug = _normalize_text(payload.get("slug"), f"article-{article_id}")
        content_html = _normalize_text(payload.get("content_html"), "")
        custom_prompt = _resolve_prompt(payload, "metadata_prompt")
        if custom_prompt:
            return (
                f"{custom_prompt}\n"
                f"article_id={article_id}\n"
                f"title={title}\n"
                f"slug={slug}\n"
                f"description={description}\n"
                f"content_html={content_html}"
            )
        return (
            "请返回 JSON 对象，字段必须包含 `title`、`description`、`canonical`、`robots`、`og_title`、`og_description`。"
            "输出内容用于 Django SEO Metadata 建议，不要生成额外解释。\n"
            f"article_id={article_id}\n"
            f"title={title}\n"
            f"slug={slug}\n"
            f"description={description}\n"
            f"content_html={content_html}"
        )

    def _build_title_prompt(self, article_id: int, payload: dict[str, Any]) -> str:
        content_html = _normalize_text(payload.get("content_html"), "")
        keywords = payload.get("keywords", [])
        keywords_str = ", ".join(keywords) if keywords else ""
        custom_prompt = _resolve_prompts(payload).get("title_prompt")
        if custom_prompt:
            return (
                f"{custom_prompt}\n"
                f"article_id={article_id}\n"
                f"keywords={keywords_str}\n"
                f"content={content_html[:2500]}"
            )
        style_hint = "风格要求：吸引点击、有悬念感、包含数字"
        if keywords_str:
            style_hint += f"，关键词：{keywords_str}"
        return (
            "你是一个标题党大师。请根据文章内容生成 5 个吸引点击的爆款标题。\n"
            f"{style_hint}\n"
            "要求：每个标题不超过 30 字，包含核心关键词，有吸引力。\n"
            "输出 JSON 对象，字段为 `titles` 数组，每项包含 `text`（标题）和 `reason`（生成理由）。\n"
            f"article_id={article_id}\n"
            f"content={content_html[:2500]}"
        )

    def _build_slug_prompt(self, article_id: int, payload: dict[str, Any]) -> str:
        title = _normalize_text(payload.get("title"), f"文章 {article_id}")
        content_html = _normalize_text(payload.get("content_html"), "")
        keywords = payload.get("keywords", [])
        keywords_str = "-".join(keywords[:5]) if keywords else ""
        custom_prompt = _resolve_prompts(payload).get("slug_prompt")
        if custom_prompt:
            return (
                f"{custom_prompt}\n"
                f"article_id={article_id}\n"
                f"title={title}\n"
                f"keywords={keywords_str}\n"
                f"content={content_html[:1500]}"
            )
        return (
            "你是一个 SEO 专家。请根据文章标题和内容生成 5 个适合 SEO 的 URL slug。\n"
            "要求：全部小写，用连字符分隔，不能有特殊字符，不超过 60 字符。\n"
            "输出 JSON 对象，字段为 `slugs` 数组，每项包含 `text`（slug）和 `reason`（生成理由）。\n"
            f"article_id={article_id}\n"
            f"title={title}\n"
            f"keywords={keywords_str}\n"
            f"content={content_html[:1500]}"
        )

    def _build_tags_prompt(self, article_id: int, payload: dict[str, Any]) -> str:
        title = _normalize_text(payload.get("title"), f"文章 {article_id}")
        content_html = _normalize_text(payload.get("content_html"), "")
        custom_prompt = _resolve_prompts(payload).get("tags_prompt")
        if custom_prompt:
            return (
                f"{custom_prompt}\n"
                f"article_id={article_id}\n"
                f"title={title}\n"
                f"content={content_html[:2000]}"
            )
        return (
            "你是一个内容标签专家。请根据文章内容提取 8-10 个相关标签。\n"
            "要求：标签要有代表性，涵盖主题、领域、关键技术等维度。\n"
            "输出 JSON 对象，字段为 `tags` 数组，每项包含 `name`（标签名）和 `reason`（提取理由）。\n"
            f"article_id={article_id}\n"
            f"title={title}\n"
            f"content={content_html[:2000]}"
        )

    def _build_description_prompt(self, article_id: int, payload: dict[str, Any]) -> str:
        title = _normalize_text(payload.get("title"), f"文章 {article_id}")
        content_html = _normalize_text(payload.get("content_html"), "")
        keywords = payload.get("keywords", [])
        keywords_str = ", ".join(keywords[:5]) if keywords else ""
        custom_prompt = _resolve_prompts(payload).get("description_prompt")
        if custom_prompt:
            return (
                f"{custom_prompt}\n"
                f"article_id={article_id}\n"
                f"title={title}\n"
                f"keywords={keywords_str}\n"
                f"content={content_html[:2000]}"
            )
        return (
            "你是一个 SEO 写作专家。请根据文章内容生成 3 个吸引人的 SEO 描述（description）。\n"
            "要求：每个描述 80-160 字，包含核心关键词，有吸引力，能引发用户点击。\n"
            "输出 JSON 对象，字段为 `descriptions` 数组，每项包含 `text`（描述文本）和 `reason`（生成理由）。\n"
            f"article_id={article_id}\n"
            f"title={title}\n"
            f"keywords={keywords_str}\n"
            f"content={content_html[:2000]}"
        )

    def _build_alt_prompt(self, article_id: int, payload: dict[str, Any]) -> str:
        custom_prompt = _resolve_prompt(payload, "alt_prompt")
        context = _build_alt_generation_context(article_id, payload)
        instruction = custom_prompt or (
            "请基于图片信息与文章上下文生成适合 SEO 和可访问性的图片 alt 文本。"
            "输出 JSON 对象，字段必须包含 `alt_text`，可选 `reason`。"
        )
        return (
            f"{instruction}\n"
            "要求：准确描述图片主体、动作或场景；结合文章主题补足语义，但不要堆砌关键词；"
            "不要输出 markdown、不要解释过程、不要写“图片中可能是”之类不确定措辞。\n"
            f"alt_generation_context={json.dumps(context, ensure_ascii=False)}"
        )

    def _placeholder_unavailable(self, action: str) -> None:
        raise ServiceError(
            status_code=501,
            code="siliconflow_not_implemented",
            message=f"SiliconFlow Provider 占位实现尚未接入 {action}",
            details={"provider": self.name, "base_url": settings.siliconflow_base_url},
        )

    def review_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> tuple[AiReviewRun, list[AiSuggestion]]:
        model = _resolve_model(payload)
        if settings.ai_log_stages:
            logger.info(
                "[ai-stage] review_article start trace_id=%s article_id=%s provider=%s",
                trace_id,
                article_id,
                self.name,
            )
        content = self._request_chat_completion(self._build_review_prompt(article_id, payload), trace_id=trace_id, model=model)
        if settings.ai_log_stages:
            logger.info(
                "[ai-stage] review_article response trace_id=%s article_id=%s content_chars=%s",
                trace_id,
                article_id,
                len(content),
            )
        body = self._parse_json_content(content, "review_article")
        title = _normalize_text(payload.get("title"), f"文章 {article_id}")
        summary = _normalize_text(payload.get("summary") or payload.get("meta_description"), "建议补充可检索关键词与结构化摘要。")
        source_chunks = _build_source_chunks(article_id, title, payload.get("url") or f"/articles/{article_id}/", summary)
        suggestions_payload = body.get("suggestions")
        if not isinstance(suggestions_payload, list) or not suggestions_payload:
            suggestions_payload = [
                {
                    "type": "metadata",
                    "severity": "medium",
                    "title": "优化元数据",
                    "reason": "标题或摘要可进一步增强搜索点击意图。",
                    "patches": [
                        {
                            "operation": "replace_text",
                            "target_block_id": "blk_metadata_title",
                            "old_text": payload.get("meta_title") or title,
                            "new_text": f"{title} | SEO 优化建议",
                            "reason": "补充更明确的搜索意图表达。",
                        }
                    ],
                }
            ]
        suggestions: list[AiSuggestion] = []
        for item in suggestions_payload[:3]:
            if not isinstance(item, dict):
                continue
            patches: list[AiPatch] = []
            raw_patches = item.get("patches")
            if isinstance(raw_patches, list):
                for patch in raw_patches:
                    if not isinstance(patch, dict):
                        continue
                    target_block_id = _normalize_text(patch.get("target_block_id"), "blk_metadata_title")
                    operation = _normalize_text(patch.get("operation"), "replace_text")
                    patches.append(
                        _build_ai_patch(
                            operation=operation,
                            target_block_id=target_block_id,
                            new_text=patch.get("new_text"),
                            old_text=patch.get("old_text"),
                            reason=_normalize_text(patch.get("reason"), item.get("reason") or "AI 建议"),
                        )
                    )
            if not patches:
                patches = [
                    _build_ai_patch(
                        operation="replace_text",
                        target_block_id="blk_metadata_title",
                        old_text=payload.get("meta_title") or title,
                        new_text=f"{title} | SEO 优化建议",
                        reason="补充更明确的搜索意图表达。",
                    )
                ]
            suggestions.append(
                AiSuggestion(
                    suggestion_id=build_suggestion_id(),
                    schema_version="v1",
                    article_id=article_id,
                    type=_normalize_text(item.get("type"), "metadata"),
                    status="pending",
                    severity=_normalize_text(item.get("severity"), "medium"),
                    title=_normalize_text(item.get("title"), "优化元数据"),
                    reason=_normalize_text(item.get("reason"), "标题或摘要可进一步增强搜索点击意图。"),
                    patches=patches,
                    source_chunks=source_chunks,
                    payload={"provider": self.name, "trace_id": trace_id},
                )
            )
        run = AiReviewRun(
            run_id=build_run_id(),
            schema_version="v1",
            article_id=article_id,
            status="completed",
            provider=self.name,
            model=model,
            prompt_version=settings.ai_prompt_version,
            created_at=utc_now(),
            completed_at=utc_now(),
            trace_id=trace_id,
            token_usage=body.get("token_usage") if isinstance(body.get("token_usage"), dict) else {},
        )
        if settings.ai_log_stages:
            logger.info(
                "[ai-stage] review_article done trace_id=%s article_id=%s suggestions=%s",
                trace_id,
                article_id,
                len(suggestions),
            )
        return run, suggestions

    def generate_metadata(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        model = _resolve_model(payload)
        content = self._request_chat_completion(self._build_metadata_prompt(article_id, payload), trace_id=trace_id, model=model)
        body = self._parse_json_content(content, "generate_metadata")
        title = _normalize_text(body.get("title"), _normalize_text(payload.get("title"), f"文章 {article_id}"))
        description = _normalize_text(body.get("description"), _normalize_text(payload.get("description"), "这是基于文章内容生成的 SEO 描述。"))
        canonical = _normalize_text(body.get("canonical"), f"https://example.com/articles/{article_id}")
        robots = _normalize_text(body.get("robots"), "index,follow")
        og_title = _normalize_text(body.get("og_title"), title)
        og_description = _normalize_text(body.get("og_description"), description)
        seo_context = SeoContext(
            seo_context_schema_version="v1",
            title=title,
            description=description,
            canonical=canonical,
            robots=robots,
            og={
                "title": og_title,
                "description": og_description,
                "image": _normalize_text(payload.get("image"), "https://example.com/og-default.png"),
                "url": _normalize_text(payload.get("url"), canonical),
                "type": "article",
            },
            twitter={
                "card": "summary_large_image",
                "title": og_title,
                "description": og_description,
                "image": _normalize_text(payload.get("image"), "https://example.com/og-default.png"),
            },
            json_ld=[{"@type": "Article", "headline": title}],
            breadcrumbs=payload.get("breadcrumbs") or [],
        )
        return {"trace_id": trace_id, "provider": self.name, "model": model, "seo_context": seo_context.to_dict()}

    def generate_faq(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        model = _resolve_model(payload)
        prompt = _resolve_prompt(payload, "faq_prompt")
        if prompt:
            content = self._request_chat_completion(
                f"{prompt}\narticle_id={article_id}\ntitle={_normalize_text(payload.get('title'), f'文章 {article_id}')}\ncontent={_truncate_text(payload.get('content_html'), 2500)}",
                trace_id=trace_id,
                model=model,
                temperature=0.4,
            )
            body = self._parse_json_content(content, "generate_faq")
            faq = body.get("faq")
            if isinstance(faq, list) and faq:
                return {
                    "trace_id": trace_id,
                    "provider": self.name,
                    "model": model,
                    "article_id": article_id,
                    "faq": faq,
                }
        self._placeholder_unavailable("generate_faq")

    def recommend_internal_links(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        model = _resolve_model(payload)
        prompt = _resolve_prompt(payload, "internal_links_prompt")
        if prompt:
            content = self._request_chat_completion(
                f"{prompt}\narticle_id={article_id}\ntitle={_normalize_text(payload.get('title'), f'文章 {article_id}')}\ncontent={_truncate_text(payload.get('content_html'), 2500)}\ncandidate_links={json.dumps(payload.get('candidate_links') or [], ensure_ascii=False)}",
                trace_id=trace_id,
                model=model,
                temperature=0.3,
            )
            body = self._parse_json_content(content, "recommend_internal_links")
            links = body.get("links")
            if isinstance(links, list) and links:
                return {
                    "trace_id": trace_id,
                    "provider": self.name,
                    "model": model,
                    "article_id": article_id,
                    "links": links,
                }
        self._placeholder_unavailable("recommend_internal_links")

    def generate_alt(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        model = _resolve_model(payload)
        prompt = self._build_alt_prompt(article_id, payload)
        if prompt:
            content = self._request_chat_completion(
                prompt,
                trace_id=trace_id,
                model=model,
                temperature=0.2,
            )
            body = self._parse_json_content(content, "generate_alt")
            alt_text = _normalize_text(body.get("alt_text"), _build_alt_text_fallback(article_id, payload))
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
                source_chunks=_build_source_chunks(article_id, f"图片 {article_id}", _normalize_text(payload.get("image_url"), "https://example.com/image.png"), alt_text),
                payload={"image_url": _normalize_text(payload.get("image_url"), ""), "provider": self.name, "trace_id": trace_id},
            )
            return {"trace_id": trace_id, "provider": self.name, "model": model, "suggestion": suggestion.to_dict()}
        self._placeholder_unavailable("generate_alt")

    def generate_title(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        model = _resolve_model(payload)
        content = self._request_chat_completion(self._build_title_prompt(article_id, payload), trace_id=trace_id, model=model, temperature=0.7)
        body = self._parse_json_content(content, "generate_title")
        titles_data = body.get("titles")
        if not isinstance(titles_data, list):
            titles_data = [
                {"text": body.get("title", f"文章 {article_id}"), "reason": "基于内容生成"}
            ]
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": model,
            "article_id": article_id,
            "titles": titles_data[:5],
        }

    def generate_slug(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        model = _resolve_model(payload)
        content = self._request_chat_completion(self._build_slug_prompt(article_id, payload), trace_id=trace_id, model=model, temperature=0.3)
        body = self._parse_json_content(content, "generate_slug")
        slugs_data = body.get("slugs")
        if not isinstance(slugs_data, list):
            slugs_data = [body.get("slug", f"article-{article_id}")]
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": model,
            "article_id": article_id,
            "slugs": [{"text": s if isinstance(s, str) else s.get("text", f"article-{article_id}"), "reason": "基于标题和关键词生成"} for s in slugs_data[:5]],
        }

    def generate_tags(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        model = _resolve_model(payload)
        content = self._request_chat_completion(self._build_tags_prompt(article_id, payload), trace_id=trace_id, model=model, temperature=0.3)
        body = self._parse_json_content(content, "generate_tags")
        tags_data = body.get("tags")
        if not isinstance(tags_data, list):
            tags_data = [body.get("tag", body.get("keyword", "AI"))]
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": model,
            "article_id": article_id,
            "tags": [{"name": t if isinstance(t, str) else t.get("name", t.get("tag", "AI")), "reason": "基于内容提取"} for t in tags_data[:10]],
        }

    def generate_description(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        model = _resolve_model(payload)
        content = self._request_chat_completion(self._build_description_prompt(article_id, payload), trace_id=trace_id, model=model, temperature=0.3)
        body = self._parse_json_content(content, "generate_description")
        descs_data = body.get("descriptions")
        if not isinstance(descs_data, list):
            descs_data = [body.get("description", body.get("text", f"文章 {article_id} 的 SEO 描述"))]
        return {
            "trace_id": trace_id,
            "provider": self.name,
            "model": model,
            "article_id": article_id,
            "descriptions": [{"text": d if isinstance(d, str) else d.get("text", d.get("description", "")), "reason": "基于内容生成"} for d in descs_data[:3]],
        }

    def reindex_article(self, article_id: int, payload: dict[str, Any], trace_id: str) -> dict[str, Any]:
        service = build_rag_service()
        return service.reindex_article(article_id=article_id, payload=payload, trace_id=trace_id)

    def search_rag(self, payload: dict[str, Any], trace_id: str) -> RagSearchResponse:
        service = build_rag_service()
        return service.search_rag(payload=payload, trace_id=trace_id)


def get_provider() -> Provider:
    if settings.normalized_provider == "siliconflow":
        return SiliconFlowProvider()
    return MockProvider()
