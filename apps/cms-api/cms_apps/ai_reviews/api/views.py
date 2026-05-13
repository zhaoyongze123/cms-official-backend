"""AI 审核 API 视图。"""

from __future__ import annotations

import json

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from cms_apps.ai_reviews.services import (
    AiTaskQueueError,
    AiSuggestionConflictError,
    AiSuggestionNotFoundError,
    accept_ai_suggestion,
    enqueue_ai_review,
    reject_ai_suggestion,
    get_review_runs_for_article,
    get_suggestions_for_run,
    serialize_patch,
    serialize_run,
)
from cms_apps.ai_reviews.selectors import get_ai_suggestions_queryset
from cms_apps.articles.api.selectors import get_article_queryset


def _parse_json_body(request):
    if not request.body:
        return {}
    try:
        body = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValidationError({"body": "请求体必须是合法的 JSON。"}) from exc
    if not isinstance(body, dict):
        raise ValidationError({"body": "请求体必须是对象。"})
    return body


def _validation_error_response(error: ValidationError):
    if hasattr(error, "message_dict"):
        details = error.message_dict
    else:
        details = {"detail": error.messages}
    return JsonResponse({"error": {"code": "validation_error", "message": "参数校验失败", "details": details}}, status=400)


def _not_found_response(message: str):
    return JsonResponse({"error": {"code": "not_found", "message": message, "details": {}}}, status=404)


def _service_error_response(error: Exception):
    return JsonResponse(
        {
            "error": {
                "code": "ai_review_service_error",
                "message": "AI 审核服务调用失败",
                "details": {"reason": str(error)},
            }
        },
        status=502,
    )


def _conflict_response(message: str):
    return JsonResponse({"error": {"code": "conflict", "message": message, "details": {}}}, status=409)


def _get_article_or_404(article_id):
    article = get_article_queryset().filter(pk=article_id).first()
    if article is None:
        return None
    return article


def _serialize_suggestion(suggestion):
    return {
        "suggestion_id": suggestion.suggestion_id,
        "schema_version": suggestion.schema_version,
        "run_id": suggestion.run.run_id,
        "article_id": suggestion.article_id,
        "type": suggestion.type,
        "status": suggestion.status,
        "severity": suggestion.severity,
        "title": suggestion.title,
        "reason": suggestion.reason,
        "payload": suggestion.payload or {},
        "patches": [serialize_patch(patch) for patch in suggestion.patches.all().order_by("id")],
        "source_chunks": suggestion.source_chunks or [],
        "created_at": suggestion.created_at.isoformat(),
        "updated_at": suggestion.updated_at.isoformat(),
    }


@require_http_methods(["POST"])
@csrf_exempt
def ai_review_view(request, article_id):
    article = _get_article_or_404(article_id)
    if article is None:
        return _not_found_response("文章不存在")

    try:
        payload = _parse_json_body(request)
    except ValidationError as error:
        return _validation_error_response(error)

    try:
        run = enqueue_ai_review(article, payload)
    except ValidationError as error:
        return _validation_error_response(error)
    except AiTaskQueueError as error:
        return JsonResponse(
            {
                "error": {
                    "code": "ai_review_queue_error",
                    "message": "AI 审核任务入队失败",
                    "details": {"reason": str(error)},
                }
            },
            status=502,
        )
    except Exception as error:
        return _service_error_response(error)
    run = get_review_runs_for_article(article).filter(run_id=run.run_id).first() or run
    return JsonResponse({"run": serialize_run(run), "suggestions": []}, status=202)


@require_http_methods(["GET"])
def ai_review_runs_view(request, article_id):
    article = _get_article_or_404(article_id)
    if article is None:
        return _not_found_response("文章不存在")
    runs = get_review_runs_for_article(article)
    return JsonResponse([serialize_run(run) for run in runs], safe=False)


@require_http_methods(["GET"])
def ai_review_run_suggestions_view(request, run_id):
    suggestions = get_ai_suggestions_queryset().filter(run__run_id=run_id).order_by("id")
    if not suggestions.exists():
        return _not_found_response("AI 审核运行不存在")
    return JsonResponse([_serialize_suggestion(suggestion) for suggestion in suggestions], safe=False)


def _suggestion_action_response(suggestion_id: str, action: str):
    try:
        if action == "accept":
            suggestion = accept_ai_suggestion(suggestion_id)
        else:
            suggestion = reject_ai_suggestion(suggestion_id)
    except AiSuggestionNotFoundError:
        return _not_found_response("AI 建议不存在")
    except AiSuggestionConflictError:
        return _conflict_response("建议当前状态不允许重复操作")
    except ValidationError as error:
        return _validation_error_response(error)
    except Exception as error:
        return _service_error_response(error)

    return JsonResponse(_serialize_suggestion(suggestion), status=200)


@require_http_methods(["POST"])
@csrf_exempt
def ai_suggestion_accept_view(request, suggestion_id):
    return _suggestion_action_response(suggestion_id, "accept")


@require_http_methods(["POST"])
@csrf_exempt
def ai_suggestion_reject_view(request, suggestion_id):
    return _suggestion_action_response(suggestion_id, "reject")
