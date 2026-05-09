from __future__ import annotations

from dataclasses import dataclass
import time
from typing import Any

from django.db import transaction
from django.utils import timezone

from .models import AiPatch, AiReviewRun, AiSuggestion, AnalyticsSnapshot, Article


class ApiError(ValueError):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code


def _build_trace_id(prefix: str, identifier: str) -> str:
    return f"{prefix}_{identifier}"


def _build_content_hash(operation: str, target_block_id: str, old_text: str | None, new_text: str | None) -> str:
    import hashlib

    raw = "|".join([operation, target_block_id, old_text or "", new_text or ""])
    return f"sha256:{hashlib.sha256(raw.encode('utf-8')).hexdigest()}"


@dataclass(frozen=True)
class MockAiClient:
    provider: str = "mock"
    model: str = "mock-review-model-v1"
    prompt_version: str = "review-v1"

    def review_article(self, article: Article) -> tuple[AiReviewRun, list[AiSuggestion]]:
        content_items = article.content_json.get("content", []) if isinstance(article.content_json, dict) else []
        intro_block = next(
            (
                item
                for item in content_items
                if isinstance(item, dict) and item.get("attrs", {}).get("blockId") == "blk_intro"
            ),
            None,
        )
        target_block_id = "blk_intro"
        old_text = _collect_text(intro_block) if intro_block else ""
        if not old_text and content_items:
            first_block = content_items[0]
            if isinstance(first_block, dict):
                target_block_id = str(first_block.get("attrs", {}).get("blockId", "blk_intro"))
                old_text = _collect_text(first_block)
        new_text = old_text.strip()
        if new_text:
            new_text = f"{new_text} 这段内容已经补充了更明确的主题、步骤和结果。"
        else:
            new_text = "优化后的正文，补充了更明确的主题、步骤和结果。"

        with transaction.atomic():
            timestamp_ns = time.time_ns()
            run = AiReviewRun.objects.create(
                run_id=f"run_{article.pk}_{timestamp_ns}",
                article=article,
                schema_version="v1",
                status="completed",
                provider=self.provider,
                model=self.model,
                prompt_version=self.prompt_version,
                trace_id=_build_trace_id("trace", str(article.pk)),
                token_usage={"prompt_tokens": 120, "completion_tokens": 80, "total_tokens": 200},
                completed_at=timezone.now(),
            )
            suggestion = AiSuggestion.objects.create(
                suggestion_id=f"sug_{article.pk}_{timestamp_ns}",
                article=article,
                run=run,
                schema_version="v1",
                type="body_replace",
                status="pending",
                severity="medium",
                title="优化正文表达",
                reason="正文可以更明确地说明主题、步骤和结果。",
                payload={
                    "provider": self.provider,
                    "model": self.model,
                    "prompt_version": self.prompt_version,
                },
                source_chunks=[
                    {
                        "chunk_id": f"chk_{article.pk}_1",
                        "source_type": "article",
                        "source_id": article.pk,
                        "title": article.title,
                        "url": article.get_absolute_url(),
                        "score": 0.93,
                    }
                ],
            )
            AiPatch.objects.create(
                patch_id=f"patch_{article.pk}_{timestamp_ns}",
                suggestion=suggestion,
                patch_schema_version="v1",
                operation="replace_text",
                target_block_id=target_block_id,
                old_text=old_text,
                new_text=new_text,
                content_hash=_build_content_hash("replace_text", target_block_id, old_text, new_text),
                reason="补充更清晰的正文表述。",
            )
        return run, [suggestion]


def serialize_ai_review_run(run: AiReviewRun) -> dict[str, Any]:
    return {
        "run_id": run.run_id,
        "schema_version": run.schema_version,
        "article_id": run.article_id,
        "status": run.status,
        "provider": run.provider,
        "model": run.model,
        "prompt_version": run.prompt_version,
        "trace_id": run.trace_id,
        "token_usage": run.token_usage,
        "error": run.error,
        "created_at": run.created_at.isoformat(),
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }


def serialize_ai_patch(patch: AiPatch) -> dict[str, Any]:
    return {
        "patch_id": patch.patch_id,
        "patch_schema_version": patch.patch_schema_version,
        "operation": patch.operation,
        "target_block_id": patch.target_block_id,
        "old_text": patch.old_text,
        "new_text": patch.new_text,
        "new_block": patch.new_block,
        "position": patch.position,
        "content_hash": patch.content_hash,
        "reason": patch.reason,
    }


def serialize_ai_suggestion(suggestion: AiSuggestion) -> dict[str, Any]:
    return {
        "suggestion_id": suggestion.suggestion_id,
        "schema_version": suggestion.schema_version,
        "article_id": suggestion.article_id,
        "type": suggestion.type,
        "status": suggestion.status,
        "severity": suggestion.severity,
        "title": suggestion.title,
        "reason": suggestion.reason,
        "payload": suggestion.payload,
        "patches": [serialize_ai_patch(patch) for patch in suggestion.patches.all()],
        "source_chunks": suggestion.source_chunks,
    }


def get_mock_ai_client() -> MockAiClient:
    return MockAiClient()


def create_article(title: str) -> Article:
    clean_title = title.strip() or "未命名文章"
    return Article.objects.create(
        title=clean_title,
        body="<p></p>",
        content_json={
            "tiptap_schema_version": "v1",
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {"blockId": "blk_intro"},
                    "content": [],
                }
            ],
        },
        content_html="<p></p>",
        status="draft",
    )


def ensure_article(article_id: int) -> Article:
    try:
        return Article.objects.get(pk=article_id)
    except Article.DoesNotExist as exc:
        raise ApiError("article_not_found", "文章不存在", {"article_id": article_id}, status_code=404) from exc


def ensure_review_run(run_id: str) -> AiReviewRun:
    try:
        return AiReviewRun.objects.get(run_id=run_id)
    except AiReviewRun.DoesNotExist as exc:
        raise ApiError("review_run_not_found", "审核运行不存在", {"run_id": run_id}, status_code=404) from exc


def ensure_suggestion(suggestion_id: str) -> AiSuggestion:
    try:
        return AiSuggestion.objects.select_related("run", "article").get(suggestion_id=suggestion_id)
    except AiSuggestion.DoesNotExist as exc:
        raise ApiError("suggestion_not_found", "建议不存在", {"suggestion_id": suggestion_id}, status_code=404) from exc


def list_article_review_runs(article: Article) -> list[dict[str, Any]]:
    runs = article.ai_review_runs.order_by("-created_at").all()
    return [serialize_ai_review_run(run) for run in runs]


def list_review_run_suggestions(run: AiReviewRun) -> list[dict[str, Any]]:
    suggestions = run.suggestions.prefetch_related("patches").order_by("-created_at")
    return [serialize_ai_suggestion(suggestion) for suggestion in suggestions]


def list_articles(query: str = "", status: str = "all") -> list[Article]:
    queryset = Article.objects.select_related("category").prefetch_related("tags").order_by("-updated_at", "-id")
    clean_query = query.strip()
    clean_status = status.strip() or "all"
    if clean_status != "all":
        queryset = queryset.filter(status=clean_status)
    if clean_query:
        queryset = queryset.filter(title__icontains=clean_query)
    return list(queryset)


def _find_block_index(content_json: dict[str, Any], block_id: str) -> int:
    for index, node in enumerate(content_json.get("content", [])):
        if node.get("attrs", {}).get("blockId") == block_id:
            return index
    raise ApiError("patch_target_not_found", "未找到目标正文块", {"block_id": block_id}, status_code=409)


def _collect_text(node: Any) -> str:
    if not isinstance(node, dict):
        return ""
    if node.get("type") == "text":
        return str(node.get("text", ""))
    return "".join(_collect_text(child) for child in node.get("content", []))


def _set_block_text(node: dict[str, Any], text: str) -> dict[str, Any]:
    updated = dict(node)
    updated["content"] = [{"type": "text", "text": text}] if text else []
    return updated


def _render_content_html(content_json: dict[str, Any]) -> str:
    html_parts: list[str] = []
    for node in content_json.get("content", []):
        node_type = node.get("type")
        text = _collect_text(node)
        if node_type == "heading":
            level = node.get("attrs", {}).get("level", 2)
            html_parts.append(f"<h{level}>{text}</h{level}>")
        elif node_type == "bulletList":
            html_parts.append(f"<ul><li>{text}</li></ul>")
        elif node_type == "orderedList":
            html_parts.append(f"<ol><li>{text}</li></ol>")
        else:
            html_parts.append(f"<p>{text}</p>")
    return "".join(html_parts) or "<p></p>"


def _apply_patch(content_json: dict[str, Any], patch: AiPatch) -> dict[str, Any]:
    next_content = list(content_json.get("content", []))
    target_index = _find_block_index(content_json, patch.target_block_id)
    target_node = next_content[target_index]
    operation = patch.operation

    if operation == "replace_text":
        old_text = _collect_text(target_node)
        if patch.old_text and old_text != patch.old_text:
            raise ApiError(
                "patch_old_text_mismatch",
                "建议基于的旧文本与当前正文不一致",
                {"expected": patch.old_text, "actual": old_text},
                status_code=409,
            )
        next_content[target_index] = _set_block_text(target_node, patch.new_text or "")
    elif operation == "delete":
        next_content.pop(target_index)
    elif operation == "insert_after":
        if not isinstance(patch.new_block, dict):
            raise ApiError("invalid_patch", "insert_after 缺少 new_block", status_code=400)
        next_content.insert(target_index + 1, patch.new_block)
    elif operation == "alt_text":
        raise ApiError("unsupported_patch", "当前版本暂不支持图片 Alt Patch 应用", status_code=400)

    return {
        **content_json,
        "content": next_content,
    }


def _ensure_suggestion_pending(suggestion: AiSuggestion) -> None:
    if suggestion.status != "pending":
        raise ApiError(
            "suggestion_not_pending",
            "建议当前状态不允许再次处理",
            {"status": suggestion.status},
            status_code=409,
        )


def accept_suggestion(
    suggestion: AiSuggestion,
    *,
    expected_content_hash: str,
    edited_content_json: dict[str, Any] | None = None,
    edited_content_html: str | None = None,
) -> tuple[AiSuggestion, Article]:
    _ensure_suggestion_pending(suggestion)
    article = suggestion.article
    current_hash = build_article_content_hash(article)
    if current_hash != expected_content_hash:
        suggestion.status = "expired"
        suggestion.save(update_fields=["status", "updated_at"])
        raise ApiError(
            "content_hash_conflict",
            "正文版本已变化，建议已过期",
            {"expected": expected_content_hash, "actual": current_hash},
            status_code=409,
        )

    if edited_content_json is not None:
        article.content_json = edited_content_json
        article.content_html = edited_content_html or _render_content_html(edited_content_json)
        article.save()
        suggestion.status = "edited"
        suggestion.save(update_fields=["status", "updated_at"])
        return suggestion, article

    next_content_json = article.content_json
    for patch in suggestion.patches.order_by("created_at", "id"):
        next_content_json = _apply_patch(next_content_json, patch)
    article.content_json = next_content_json
    article.content_html = _render_content_html(next_content_json)
    article.save()
    suggestion.status = "accepted"
    suggestion.save(update_fields=["status", "updated_at"])
    return suggestion, article


def reject_suggestion(suggestion: AiSuggestion) -> AiSuggestion:
    _ensure_suggestion_pending(suggestion)
    suggestion.status = "rejected"
    suggestion.save(update_fields=["status", "updated_at"])
    return suggestion


def build_article_content_hash(article: Article) -> str:
    import hashlib

    payload = {
        "title": article.title,
        "content_json": article.content_json,
        "content_html": article.content_html,
    }
    digest = hashlib.sha256(str(payload).encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def build_seo_check(article: Article) -> dict[str, Any]:
    checks: list[dict[str, str]] = []
    content_items = article.content_json.get("content", []) if isinstance(article.content_json, dict) else []
    plain_text = "\n".join(_collect_text(item).strip() for item in content_items).strip()

    if len(article.title.strip()) < 8:
        checks.append({"level": "error", "code": "title_too_short", "message": "标题至少需要 8 个字符"})
    else:
        checks.append({"level": "passed", "code": "title_ok", "message": "标题长度通过"})

    if not article.slug.strip():
        checks.append({"level": "error", "code": "slug_missing", "message": "Slug 不能为空"})
    else:
        checks.append({"level": "passed", "code": "slug_ok", "message": "Slug 已填写"})

    if len(article.meta_description.strip()) < 20:
        checks.append(
            {"level": "warning", "code": "meta_description_short", "message": "Meta Description 建议至少 20 个字符"}
        )
    else:
        checks.append({"level": "passed", "code": "meta_description_ok", "message": "Meta Description 已填写"})

    if not plain_text:
        checks.append({"level": "error", "code": "body_missing", "message": "正文不能为空"})
    elif len(plain_text) < 50:
        checks.append({"level": "warning", "code": "body_too_short", "message": "正文建议至少 50 个字符"})
    else:
        checks.append({"level": "passed", "code": "body_ok", "message": "正文长度通过"})

    pending_suggestions = article.ai_suggestions.filter(status="pending").count()
    if pending_suggestions > 0:
        checks.append(
            {
                "level": "warning",
                "code": "pending_ai_suggestions",
                "message": f"仍有 {pending_suggestions} 条 AI 建议未处理",
            }
        )
    else:
        checks.append({"level": "passed", "code": "ai_review_clean", "message": "没有待处理 AI 建议"})

    errors = sum(1 for item in checks if item["level"] == "error")
    warnings = sum(1 for item in checks if item["level"] == "warning")
    passed = sum(1 for item in checks if item["level"] == "passed")
    return {
        "article_id": article.id,
        "checks": checks,
        "summary": {
            "errors": errors,
            "warnings": warnings,
            "passed": passed,
            "can_publish": errors == 0,
        },
    }


def publish_article(article: Article) -> dict[str, Any]:
    seo_check = build_seo_check(article)
    if not seo_check["summary"]["can_publish"]:
        raise ApiError("publish_blocked", "发布前检查未通过", {"seo_check": seo_check}, status_code=409)
    article.status = "published"
    if article.publish_date is None:
        article.publish_date = timezone.now()
    article.save()
    return seo_check


def _round_metric(value: float) -> float:
    return round(value, 4)


def serialize_analytics_snapshot(snapshot: AnalyticsSnapshot) -> dict[str, Any]:
    return {
        "source": snapshot.source,
        "schema_version": snapshot.schema_version,
        "snapshot_date": snapshot.snapshot_date.isoformat(),
        "impressions": snapshot.impressions,
        "clicks": snapshot.clicks,
        "ctr": _round_metric(snapshot.ctr),
        "average_position": _round_metric(snapshot.average_position),
        "pageviews": snapshot.pageviews,
        "avg_time_on_page": snapshot.avg_time_on_page,
        "bounce_rate": _round_metric(snapshot.bounce_rate),
        "conversions": snapshot.conversions,
        "internal_clicks": snapshot.internal_clicks,
        "ai_acceptance_rate": _round_metric(snapshot.ai_acceptance_rate),
        "payload": snapshot.payload,
    }


def get_article_analytics(article: Article) -> dict[str, Any]:
    snapshots = list(article.analytics_snapshots.order_by("snapshot_date", "source"))
    latest_by_source: dict[str, AnalyticsSnapshot] = {}
    timeline_map: dict[str, dict[str, Any]] = {}
    for snapshot in snapshots:
        latest_by_source[snapshot.source] = snapshot
        date_key = snapshot.snapshot_date.isoformat()
        entry = timeline_map.setdefault(
            date_key,
            {
                "snapshot_date": date_key,
                "impressions": 0,
                "clicks": 0,
                "pageviews": 0,
                "internal_clicks": 0,
                "conversions": 0,
                "average_position_values": [],
                "ctr_values": [],
                "ai_acceptance_rate_values": [],
            },
        )
        entry["impressions"] += snapshot.impressions
        entry["clicks"] += snapshot.clicks
        entry["pageviews"] += snapshot.pageviews
        entry["internal_clicks"] += snapshot.internal_clicks
        entry["conversions"] += snapshot.conversions
        entry["average_position_values"].append(snapshot.average_position)
        entry["ctr_values"].append(snapshot.ctr)
        entry["ai_acceptance_rate_values"].append(snapshot.ai_acceptance_rate)

    source_items = {source: serialize_analytics_snapshot(snapshot) for source, snapshot in latest_by_source.items()}
    overview = {
        "published": article.status == "published",
        "snapshot_count": len(snapshots),
        "tracked_sources": sorted(source_items.keys()),
        "total_impressions": sum(item["impressions"] for item in source_items.values()),
        "total_clicks": sum(item["clicks"] for item in source_items.values()),
        "total_pageviews": sum(item["pageviews"] for item in source_items.values()),
        "total_internal_clicks": sum(item["internal_clicks"] for item in source_items.values()),
        "total_conversions": sum(item["conversions"] for item in source_items.values()),
        "average_ai_acceptance_rate": _round_metric(
            sum(item["ai_acceptance_rate"] for item in source_items.values()) / len(source_items)
        )
        if source_items
        else 0,
    }
    timeline = []
    for date_key in sorted(timeline_map.keys()):
        item = timeline_map[date_key]
        timeline.append(
            {
                "snapshot_date": date_key,
                "impressions": item["impressions"],
                "clicks": item["clicks"],
                "pageviews": item["pageviews"],
                "internal_clicks": item["internal_clicks"],
                "conversions": item["conversions"],
                "average_position": _round_metric(
                    sum(item["average_position_values"]) / len(item["average_position_values"])
                ),
                "ctr": _round_metric(sum(item["ctr_values"]) / len(item["ctr_values"])),
                "ai_acceptance_rate": _round_metric(
                    sum(item["ai_acceptance_rate_values"]) / len(item["ai_acceptance_rate_values"])
                ),
            }
        )

    return {
        "article_id": article.id,
        "article_title": article.title,
        "article_slug": article.slug,
        "generated_at": timezone.now().isoformat(),
        "overview": overview,
        "sources": source_items,
        "timeline": timeline,
    }


def get_seo_summary() -> dict[str, Any]:
    published_articles = list(Article.objects.filter(status="published").order_by("id"))
    article_payloads = [get_article_analytics(article) for article in published_articles]
    totals = {
        "published_articles": len(published_articles),
        "tracked_articles": sum(1 for payload in article_payloads if payload["overview"]["snapshot_count"] > 0),
        "total_impressions": sum(payload["overview"]["total_impressions"] for payload in article_payloads),
        "total_clicks": sum(payload["overview"]["total_clicks"] for payload in article_payloads),
        "total_pageviews": sum(payload["overview"]["total_pageviews"] for payload in article_payloads),
        "total_internal_clicks": sum(payload["overview"]["total_internal_clicks"] for payload in article_payloads),
        "total_conversions": sum(payload["overview"]["total_conversions"] for payload in article_payloads),
        "average_ai_acceptance_rate": _round_metric(
            sum(payload["overview"]["average_ai_acceptance_rate"] for payload in article_payloads) / len(article_payloads)
        )
        if article_payloads
        else 0,
    }
    top_articles = sorted(
        [
            {
                "article_id": payload["article_id"],
                "title": payload["article_title"],
                "slug": payload["article_slug"],
                "pageviews": payload["overview"]["total_pageviews"],
                "clicks": payload["overview"]["total_clicks"],
                "impressions": payload["overview"]["total_impressions"],
                "ai_acceptance_rate": payload["overview"]["average_ai_acceptance_rate"],
            }
            for payload in article_payloads
        ],
        key=lambda item: (item["pageviews"], item["clicks"], item["impressions"]),
        reverse=True,
    )[:5]
    source_health = []
    for source in ("gsc", "ga4", "internal"):
        source_snapshots = AnalyticsSnapshot.objects.filter(source=source)
        latest_snapshot_date = source_snapshots.order_by("-snapshot_date").values_list("snapshot_date", flat=True).first()
        source_health.append(
            {
                "source": source,
                "snapshot_count": source_snapshots.count(),
                "article_count": source_snapshots.values("article_id").distinct().count(),
                "latest_snapshot_date": latest_snapshot_date.isoformat() if latest_snapshot_date else None,
            }
        )

    return {
        "generated_at": timezone.now().isoformat(),
        "totals": totals,
        "top_articles": top_articles,
        "source_health": source_health,
    }
