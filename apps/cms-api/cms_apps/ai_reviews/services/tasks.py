"""AI 异步任务队列与消费逻辑。"""

from __future__ import annotations

import json
import os
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction

from cms_apps.ai_reviews.models import AiPatch, AiReviewRun, AiSuggestion
from cms_apps.articles.models import Article
from .configuration import build_ai_generation_request_config

try:
    from redis import Redis
except ImportError:  # pragma: no cover - 容器内依赖存在，本地兜底仅用于给出清晰错误
    Redis = None


AI_REVIEW_REQUEST_TIMEOUT = 240
AI_QUEUE_NAME = getattr(settings, "AI_TASK_QUEUE_NAME", "cms:ai:tasks")
AI_SERVICE_URL = getattr(settings, "AI_SERVICE_URL", "http://ai-service:8000")
INTERNAL_API_TOKEN = getattr(settings, "INTERNAL_API_TOKEN", "")
REDIS_URL = getattr(settings, "REDIS_URL", "redis://redis:6379/0")
DEFAULT_PROVIDER = os.getenv("AI_PROVIDER", "mock")
DEFAULT_MODEL = os.getenv("AI_MODEL", "mock-reviewer")
DEFAULT_PROMPT_VERSION = os.getenv("AI_PROMPT_VERSION", "v1")


class AiTaskQueueError(Exception):
    """AI 任务队列异常。"""


@dataclass(frozen=True)
class AiTaskMessage:
    task_type: str
    run_id: str
    article_id: int
    payload: dict[str, Any]

    def to_json(self) -> str:
        return json.dumps(
            {
                "task_type": self.task_type,
                "run_id": self.run_id,
                "article_id": self.article_id,
                "payload": self.payload,
            },
            ensure_ascii=False,
            default=_json_default,
        )

    @classmethod
    def from_json(cls, raw: str) -> "AiTaskMessage":
        body = json.loads(raw)
        return cls(
            task_type=str(body["task_type"]),
            run_id=str(body["run_id"]),
            article_id=int(body["article_id"]),
            payload=body.get("payload") or {},
        )


def _json_default(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _redis_client() -> "Redis":
    if Redis is None:
        raise AiTaskQueueError("缺少 redis Python 依赖，无法启动 AI 异步任务。")
    return Redis.from_url(REDIS_URL, decode_responses=True)


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
    opener = urllib_request.build_opener(urllib_request.ProxyHandler({}))
    try:
        with opener.open(request, timeout=AI_REVIEW_REQUEST_TIMEOUT) as response:
            response_body = response.read().decode("utf-8")
    except urllib_error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise ValidationError(
            {
                "ai_service": f"FastAPI AI 接口返回错误，状态码 {exc.code}。",
                "details": error_body,
            }
        ) from exc
    except urllib_error.URLError as exc:
        raise ValidationError({"ai_service": f"无法调用 FastAPI AI 接口：{exc.reason}"}) from exc

    try:
        return json.loads(response_body)
    except json.JSONDecodeError as exc:
        raise ValidationError({"ai_service": "FastAPI AI 接口返回了非法 JSON。"}) from exc


def build_ai_review_request_payload(article: Article, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "article_id": article.id,
        "title": payload.get("title") or article.title,
        "slug": payload.get("slug") or article.slug,
        "summary": payload.get("summary") or payload.get("meta_description") or article.meta_description or "",
        "meta_description": payload.get("meta_description") or article.meta_description or "",
        "content_html": payload.get("content_html") or article.content_html or "",
        "content_json": payload.get("content_json") or article.content_json or {},
        "status": payload.get("status") or article.status,
        "payload": payload,
    }


def build_generate_metadata_request_payload(article: Article, payload: dict[str, Any]) -> dict[str, Any]:
    request_payload = {
        "article_id": article.id,
        "title": payload.get("title") or article.title,
        "slug": payload.get("slug") or article.slug,
        "description": payload.get("summary") or payload.get("meta_description") or article.meta_description or "",
        "canonical": payload.get("canonical") or "",
        "robots": payload.get("robots") or "index,follow",
        "content_html": payload.get("content_html") or article.content_html or "",
        "content_json": payload.get("content_json") or article.content_json or {},
        "status": payload.get("status") or article.status,
        "payload": payload,
    }
    request_payload.update(build_ai_generation_request_config())
    models = request_payload.pop("models", {})
    if isinstance(models, dict):
        request_payload["model"] = models.get("generation") or payload.get("model") or DEFAULT_MODEL
    return request_payload


def build_generate_alt_request_payload(article: Article, payload: dict[str, Any]) -> dict[str, Any]:
    request_payload = build_generate_metadata_request_payload(article, payload)
    models = build_ai_generation_request_config().get("models", {})
    if isinstance(models, dict):
        request_payload["model"] = (
            payload.get("model")
            or models.get("alt")
            or models.get("generation")
            or DEFAULT_MODEL
        )
    return request_payload


def create_pending_review_run(article: Article) -> AiReviewRun:
    run_id = f"run_{uuid.uuid4().hex}"
    return AiReviewRun.objects.create(
        run_id=run_id,
        schema_version="v1",
        article=article,
        status="pending",
        provider=DEFAULT_PROVIDER,
        model=DEFAULT_MODEL,
        prompt_version=DEFAULT_PROMPT_VERSION,
        trace_id="",
        token_usage={},
        error=None,
    )


def enqueue_ai_review(article: Article, payload: dict[str, Any]) -> AiReviewRun:
    run = create_pending_review_run(article)
    message = AiTaskMessage(
        task_type="review_article",
        run_id=run.run_id,
        article_id=article.id,
        payload=build_ai_review_request_payload(article, payload),
    )
    try:
        _redis_client().lpush(AI_QUEUE_NAME, message.to_json())
    except Exception as exc:  # pragma: no cover - 依赖真实 Redis
        run.status = "failed"
        run.error = {"code": "queue_error", "message": str(exc), "details": {"queue": AI_QUEUE_NAME}}
        run.completed_at = _now()
        run.save(update_fields=["status", "error", "completed_at"])
        raise AiTaskQueueError(f"AI 审核任务入队失败：{exc}") from exc
    return run


def generate_metadata_with_fastapi(article: Article, payload: dict[str, Any]) -> dict[str, Any]:
    return _http_post_json("/internal/ai/generate-metadata", build_generate_metadata_request_payload(article, payload))


def generate_title_with_fastapi(article: Article, payload: dict[str, Any]) -> dict[str, Any]:
    return _http_post_json("/internal/ai/generate-title", build_generate_metadata_request_payload(article, payload))


def generate_slug_with_fastapi(article: Article, payload: dict[str, Any]) -> dict[str, Any]:
    return _http_post_json("/internal/ai/generate-slug", build_generate_metadata_request_payload(article, payload))


def generate_tags_with_fastapi(article: Article, payload: dict[str, Any]) -> dict[str, Any]:
    return _http_post_json("/internal/ai/generate-tags", build_generate_metadata_request_payload(article, payload))


def generate_description_with_fastapi(article: Article, payload: dict[str, Any]) -> dict[str, Any]:
    return _http_post_json("/internal/ai/generate-description", build_generate_metadata_request_payload(article, payload))


def generate_alt_with_fastapi(article: Article, payload: dict[str, Any]) -> dict[str, Any]:
    return _http_post_json("/internal/ai/generate-alt", build_generate_alt_request_payload(article, payload))


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


def _build_patch_content_hash(suggestion_payload: dict[str, Any], patch_payload: dict[str, Any]) -> str:
    import hashlib

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


def _normalize_run_payload(run_payload: dict[str, Any], article: Article, run: AiReviewRun) -> dict[str, Any]:
    normalized = dict(run_payload)
    normalized.setdefault("run_id", run.run_id)
    normalized.setdefault("schema_version", "v1")
    normalized.setdefault("article_id", article.id)
    normalized.setdefault("status", "completed")
    normalized.setdefault("provider", DEFAULT_PROVIDER)
    normalized.setdefault("model", DEFAULT_MODEL)
    normalized.setdefault("prompt_version", DEFAULT_PROMPT_VERSION)
    normalized.setdefault("trace_id", "")
    normalized.setdefault("token_usage", {})
    normalized.setdefault("error", None)
    normalized.setdefault("completed_at", _now())
    return normalized


def _normalize_suggestion_payload(suggestion_payload: dict[str, Any], article: Article, run: AiReviewRun) -> dict[str, Any]:
    normalized = dict(suggestion_payload)
    normalized.setdefault("suggestion_id", f"sug_{uuid.uuid4().hex}")
    normalized.setdefault("schema_version", "v1")
    normalized.setdefault("article_id", article.id)
    normalized.setdefault("status", "pending")
    normalized.setdefault("payload", {})
    normalized.setdefault("source_chunks", _fallback_source_chunks(article))
    normalized.setdefault("patches", [])
    return normalized


@transaction.atomic
def complete_review_run_from_response(run_id: str, response: dict[str, Any]) -> AiReviewRun:
    run = AiReviewRun.objects.select_for_update().filter(run_id=run_id).first()
    if run is None:
        raise AiTaskQueueError(f"找不到待完成的 AiReviewRun: {run_id}")
    article = run.article

    run_payload = _normalize_run_payload(response.get("run", {}), article, run)
    run.status = run_payload["status"]
    run.provider = run_payload["provider"]
    run.model = run_payload["model"]
    run.prompt_version = run_payload["prompt_version"]
    run.trace_id = run_payload.get("trace_id", "")
    run.token_usage = run_payload.get("token_usage") or {}
    run.error = run_payload.get("error")
    run.completed_at = run_payload.get("completed_at")
    run.save(
        update_fields=[
            "status",
            "provider",
            "model",
            "prompt_version",
            "trace_id",
            "token_usage",
            "error",
            "completed_at",
        ]
    )

    run.suggestions.all().delete()
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
                patch_id=patch_payload.get("patch_id", f"patch_{uuid.uuid4().hex}"),
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


@transaction.atomic
def mark_review_run_running(run_id: str) -> AiReviewRun:
    run = AiReviewRun.objects.select_for_update().filter(run_id=run_id).first()
    if run is None:
        raise AiTaskQueueError(f"找不到待消费的 AiReviewRun: {run_id}")
    run.status = "running"
    run.error = None
    run.save(update_fields=["status", "error"])
    return run


@transaction.atomic
def mark_review_run_failed(run_id: str, error_message: str, code: str = "worker_error", details: dict[str, Any] | None = None) -> AiReviewRun:
    run = AiReviewRun.objects.select_for_update().filter(run_id=run_id).first()
    if run is None:
        raise AiTaskQueueError(f"找不到待标记失败的 AiReviewRun: {run_id}")
    run.status = "failed"
    run.error = {
        "code": code,
        "message": error_message,
        "details": details or {},
    }
    run.completed_at = _now()
    run.save(update_fields=["status", "error", "completed_at"])
    return run


def consume_review_task(message: AiTaskMessage) -> AiReviewRun:
    print(
        f"[worker] review start run_id={message.run_id} article_id={message.article_id} "
        f"payload_keys={sorted(message.payload.keys())}",
        flush=True,
    )
    mark_review_run_running(message.run_id)
    response = _http_post_json("/internal/ai/review-article", message.payload)
    print(
        f"[worker] review response run_id={message.run_id} "
        f"suggestions={len(response.get('suggestions', []))}",
        flush=True,
    )
    run = complete_review_run_from_response(message.run_id, response)
    print(
        f"[worker] review completed run_id={message.run_id} status={run.status}",
        flush=True,
    )
    return run


def ensure_django_setup() -> None:
    repo_root = Path(__file__).resolve().parents[5]
    cms_api_root = repo_root / "apps" / "cms-api"
    for path in (str(cms_api_root), str(repo_root)):
        if path not in sys.path:
            sys.path.insert(0, path)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")


def pop_task(timeout_seconds: int = 5) -> AiTaskMessage | None:
    item = _redis_client().brpop(AI_QUEUE_NAME, timeout=timeout_seconds)
    if item is None:
        return None
    _, raw = item
    return AiTaskMessage.from_json(raw)
