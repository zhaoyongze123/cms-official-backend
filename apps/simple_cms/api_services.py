from __future__ import annotations

from dataclasses import dataclass
import time
from typing import Any

from django.db import transaction
from django.utils import timezone

from .models import AiPatch, AiReviewRun, AiSuggestion, Article


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
                target_block_id="blk_intro",
                old_text="原始正文",
                new_text="优化后的正文",
                content_hash=_build_content_hash("replace_text", "blk_intro", "原始正文", "优化后的正文"),
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


def accept_suggestion(suggestion: AiSuggestion) -> AiSuggestion:
    suggestion.status = "accepted"
    suggestion.save(update_fields=["status", "updated_at"])
    return suggestion


def reject_suggestion(suggestion: AiSuggestion) -> AiSuggestion:
    suggestion.status = "rejected"
    suggestion.save(update_fields=["status", "updated_at"])
    return suggestion
