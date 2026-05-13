"""AI 审核业务服务实现。"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction

from cms_apps.ai_reviews.models import AiPatch, AiReviewRun, AiSuggestion
from cms_apps.articles.models import Article
from cms_apps.ai_reviews.selectors.review import get_ai_suggestion_by_suggestion_id
from .configuration import build_ai_generation_request_config


AI_SERVICE_URL = getattr(settings, "AI_SERVICE_URL", "http://ai-service:8000")
INTERNAL_API_TOKEN = getattr(settings, "INTERNAL_API_TOKEN", "")
AI_REVIEW_PROMPT_VERSION = "v1"
AI_REVIEW_PROVIDER = "fastapi"
AI_REVIEW_MODEL = "fastapi-reviewer"
AI_REVIEW_REQUEST_TIMEOUT = 30
PATCH_TARGET_BLOCK_ID_PATTERN = re.compile(r"^blk_[A-Za-z0-9_-]+$")
PATCH_OPERATION_ALLOWED = {"insert_after", "delete", "replace_text", "alt_text"}
PATCH_BODY_OPERATIONS = {"insert_after", "delete", "replace_text"}


class AiSuggestionNotFoundError(Exception):
    """AI 建议不存在。"""


class AiSuggestionConflictError(Exception):
    """AI 建议状态冲突。"""


def _json_default(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _build_url(path: str) -> str:
    return f"{AI_SERVICE_URL.rstrip('/')}{path}"


def _http_post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False, default=_json_default).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if INTERNAL_API_TOKEN:
        headers["X-Internal-Token"] = INTERNAL_API_TOKEN
    request = urllib_request.Request(_build_url(path), data=body, headers=headers, method="POST")
    try:
        with urllib_request.urlopen(request, timeout=AI_REVIEW_REQUEST_TIMEOUT) as response:
            response_body = response.read().decode("utf-8")
    except urllib_error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise ValidationError(
            {
                "ai_service": f"FastAPI 审核接口返回错误，状态码 {exc.code}。",
                "details": error_body,
            }
        ) from exc
    except urllib_error.URLError as exc:
        raise ValidationError({"ai_service": f"无法调用 FastAPI 审核接口：{exc.reason}"}) from exc

    try:
        return json.loads(response_body)
    except json.JSONDecodeError as exc:
        raise ValidationError({"ai_service": "FastAPI 审核接口返回了非法 JSON。"}) from exc


def _serialize_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def serialize_patch(patch: AiPatch) -> dict[str, Any]:
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


def _serialize_suggestion(suggestion: AiSuggestion) -> dict[str, Any]:
    return {
        "suggestion_id": suggestion.suggestion_id,
        "schema_version": suggestion.schema_version,
        "article_id": suggestion.article_id,
        "type": suggestion.type,
        "status": suggestion.status,
        "severity": suggestion.severity,
        "title": suggestion.title,
        "reason": suggestion.reason,
        "payload": suggestion.payload or {},
        "patches": [serialize_patch(patch) for patch in suggestion.patches.all().order_by("id")],
        "source_chunks": suggestion.source_chunks or [],
        "created_at": _serialize_datetime(suggestion.created_at),
        "updated_at": _serialize_datetime(suggestion.updated_at),
    }


def serialize_run(run: AiReviewRun) -> dict[str, Any]:
    return {
        "run_id": run.run_id,
        "schema_version": run.schema_version,
        "article_id": run.article_id,
        "status": run.status,
        "provider": run.provider,
        "model": run.model,
        "prompt_version": run.prompt_version,
        "trace_id": run.trace_id,
        "token_usage": run.token_usage or {},
        "error": run.error,
        "created_at": _serialize_datetime(run.created_at),
        "completed_at": _serialize_datetime(run.completed_at),
    }


def _build_patch_content_hash(suggestion_payload: dict[str, Any], patch_payload: dict[str, Any]) -> str:
    content = {
        "suggestion_id": suggestion_payload["suggestion_id"],
        "operation": patch_payload.get("operation"),
        "target_block_id": patch_payload.get("target_block_id"),
        "old_text": patch_payload.get("old_text"),
        "new_text": patch_payload.get("new_text"),
        "new_block": patch_payload.get("new_block"),
        "position": patch_payload.get("position"),
        "reason": patch_payload.get("reason"),
    }
    encoded = json.dumps(content, ensure_ascii=False, sort_keys=True, default=_json_default).encode("utf-8")
    return f"sha256:{hashlib.sha256(encoded).hexdigest()}"


def _fallback_source_chunks(article: Article) -> list[dict[str, Any]]:
    return [
        {
            "chunk_id": f"chunk_{article.id}_1",
            "source_type": "article",
            "source_id": article.id,
            "title": article.title,
            "url": article.get_absolute_url(),
            "score": 1.0,
        }
    ]


def _normalize_run_payload(run_payload: dict[str, Any], article: Article) -> dict[str, Any]:
    normalized = dict(run_payload)
    normalized.setdefault("run_id", f"run_{article.id}_{int(_now().timestamp())}")
    normalized.setdefault("schema_version", "v1")
    normalized.setdefault("article_id", article.id)
    normalized.setdefault("status", "completed")
    normalized.setdefault("provider", AI_REVIEW_PROVIDER)
    normalized.setdefault("model", AI_REVIEW_MODEL)
    normalized.setdefault("prompt_version", AI_REVIEW_PROMPT_VERSION)
    normalized.setdefault("trace_id", "")
    normalized.setdefault("token_usage", {})
    normalized.setdefault("error", None)
    normalized.setdefault("completed_at", _now())
    return normalized


def _normalize_suggestion_payload(suggestion_payload: dict[str, Any], article: Article, run: AiReviewRun) -> dict[str, Any]:
    normalized = dict(suggestion_payload)
    normalized.setdefault("suggestion_id", f"sug_{article.id}_{len(run.suggestions.all()) + 1}")
    normalized.setdefault("schema_version", "v1")
    normalized.setdefault("article_id", article.id)
    normalized.setdefault("status", "pending")
    normalized.setdefault("payload", {})
    normalized.setdefault("source_chunks", _fallback_source_chunks(article))
    normalized.setdefault("patches", [])
    return normalized


@transaction.atomic
def review_article_with_fastapi(article: Article, payload: dict[str, Any]) -> AiReviewRun:
    request_payload = {
        "article_id": article.id,
        "title": article.title,
        "slug": article.slug,
        "summary": article.meta_description or "",
        "content_html": article.content_html or "",
        "content_json": article.content_json or {},
        "status": article.status,
        "payload": payload,
    }
    request_payload.update(build_ai_generation_request_config())
    models = request_payload.pop("models", {})
    if isinstance(models, dict):
        request_payload["model"] = models.get("review") or AI_REVIEW_MODEL
    response = _http_post_json(
        "/internal/ai/review-article",
        request_payload,
    )
    run_payload = _normalize_run_payload(response.get("run", {}), article)
    run = AiReviewRun.objects.create(
        run_id=run_payload["run_id"],
        schema_version=run_payload["schema_version"],
        article=article,
        status=run_payload["status"],
        provider=run_payload["provider"],
        model=run_payload["model"],
        prompt_version=run_payload["prompt_version"],
        trace_id=run_payload.get("trace_id", ""),
        token_usage=run_payload.get("token_usage") or {},
        error=run_payload.get("error"),
        completed_at=run_payload.get("completed_at"),
    )

    for suggestion_payload in response.get("suggestions", []):
        normalized_suggestion = _normalize_suggestion_payload(suggestion_payload, article, run)
        suggestion = AiSuggestion.objects.create(
            suggestion_id=normalized_suggestion["suggestion_id"],
            schema_version=normalized_suggestion["schema_version"],
            run=run,
            article=article,
            type=normalized_suggestion["type"],
            status=normalized_suggestion["status"],
            severity=normalized_suggestion["severity"],
            title=normalized_suggestion["title"],
            reason=normalized_suggestion["reason"],
            payload=normalized_suggestion.get("payload") or {},
            source_chunks=normalized_suggestion.get("source_chunks") or [],
        )
        for patch_payload in normalized_suggestion.get("patches", []):
            AiPatch.objects.create(
                patch_id=patch_payload.get("patch_id", f"patch_{suggestion.id}_{suggestion.patches.count() + 1}"),
                patch_schema_version=patch_payload.get("patch_schema_version", "v1"),
                suggestion=suggestion,
                operation=patch_payload["operation"],
                target_block_id=patch_payload["target_block_id"],
                old_text=patch_payload.get("old_text"),
                new_text=patch_payload.get("new_text"),
                new_block=patch_payload.get("new_block"),
                position=patch_payload.get("position"),
                content_hash=patch_payload.get("content_hash")
                or _build_patch_content_hash(normalized_suggestion, patch_payload),
                reason=patch_payload.get("reason"),
            )

    return run


def get_review_runs_for_article(article: Article):
    return (
        AiReviewRun.objects.filter(article=article)
        .prefetch_related("suggestions__patches")
        .order_by("-created_at", "-id")
    )


def get_suggestions_for_run(run_id: str):
    return (
        AiSuggestion.objects.filter(run__run_id=run_id)
        .select_related("article", "run")
        .prefetch_related("patches")
        .order_by("id")
    )


def _suggestion_not_found_error() -> ValidationError:
    return ValidationError({"suggestion_id": "AI 建议不存在。"})


def _operation_not_allowed_error(operation: str) -> ValidationError:
    return ValidationError({"operation": f"不支持的 patch 操作：{operation}。"})


def _patch_validation_error(message: str, index: int | None = None) -> ValidationError:
    key = f"patches[{index}]" if index is not None else "patches"
    return ValidationError({key: message})


def _validate_patch_payload(patch_payload: dict[str, Any], index: int) -> None:
    patch_id = patch_payload.get("patch_id")
    if not patch_id:
        raise _patch_validation_error("patch_id 不能为空。", index)
    if patch_payload.get("patch_schema_version") != "v1":
        raise _patch_validation_error("patch_schema_version 必须为 v1。", index)

    operation = patch_payload.get("operation")
    if operation not in PATCH_OPERATION_ALLOWED:
        raise _patch_validation_error("patch operation 不在允许范围内。", index)

    target_block_id = patch_payload.get("target_block_id")
    if not target_block_id or not PATCH_TARGET_BLOCK_ID_PATTERN.match(str(target_block_id)):
        raise _patch_validation_error("target_block_id 格式不合法。", index)

    content_hash = patch_payload.get("content_hash")
    if not content_hash:
        raise _patch_validation_error("content_hash 不能为空。", index)

    if operation in PATCH_BODY_OPERATIONS:
        if not patch_payload.get("target_block_id"):
            raise _patch_validation_error("正文 patch 必须包含 target_block_id。", index)
        if not content_hash:
            raise _patch_validation_error("正文 patch 必须包含 content_hash。", index)


def _validate_suggestion_for_accept(suggestion: AiSuggestion) -> None:
    if suggestion.status != "pending":
        raise ValidationError({"status": "仅待处理建议可以执行此操作。"})
    for index, patch in enumerate(suggestion.patches.all().order_by("id")):
        _validate_patch_payload(serialize_patch(patch), index)


def _conflict_response_error() -> ValidationError:
    return ValidationError({"status": "建议当前状态不允许重复操作。"})


@transaction.atomic
def accept_ai_suggestion(suggestion_id: str) -> AiSuggestion:
    try:
        suggestion = get_ai_suggestion_by_suggestion_id(suggestion_id)
    except ValidationError as exc:
        raise AiSuggestionNotFoundError from exc
    suggestion = AiSuggestion.objects.select_for_update().select_related("article", "run").prefetch_related("patches").get(pk=suggestion.pk)
    if suggestion.status != "pending":
        raise AiSuggestionConflictError

    _validate_suggestion_for_accept(suggestion)
    suggestion.status = "accepted"
    suggestion.save(update_fields=["status", "updated_at"])
    return suggestion


@transaction.atomic
def reject_ai_suggestion(suggestion_id: str) -> AiSuggestion:
    try:
        suggestion = get_ai_suggestion_by_suggestion_id(suggestion_id)
    except ValidationError as exc:
        raise AiSuggestionNotFoundError from exc
    suggestion = AiSuggestion.objects.select_for_update().select_related("article", "run").prefetch_related("patches").get(pk=suggestion.pk)
    if suggestion.status != "pending":
        raise AiSuggestionConflictError

    suggestion.status = "rejected"
    suggestion.save(update_fields=["status", "updated_at"])
    return suggestion
