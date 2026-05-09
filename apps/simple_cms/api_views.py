from __future__ import annotations

import json
from typing import Any

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .api_services import (
    ApiError,
    accept_suggestion,
    ensure_article,
    ensure_review_run,
    ensure_suggestion,
    get_article_analytics,
    get_mock_ai_client,
    get_seo_summary,
    list_article_review_runs,
    list_review_run_suggestions,
    reject_suggestion,
    serialize_ai_review_run,
    serialize_ai_suggestion,
)


def _json_body(request) -> dict[str, Any]:
    if not request.body:
        return {}
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ApiError("invalid_json", "请求体必须是合法 JSON", status_code=400) from exc
    if not isinstance(data, dict):
        raise ApiError("invalid_json", "请求体必须是对象", status_code=400)
    return data


def _success(payload: dict[str, Any], status: int = 200) -> JsonResponse:
    return JsonResponse(payload, status=status, json_dumps_params={"ensure_ascii": False})


def _error_response(error: ApiError) -> JsonResponse:
    return JsonResponse(
        {
            "error": {
                "code": error.code,
                "message": error.message,
                "details": error.details,
            }
        },
        status=error.status_code,
        json_dumps_params={"ensure_ascii": False},
    )


def _handle_api_error(view_func):
    def wrapper(request, *args, **kwargs):
        try:
            return view_func(request, *args, **kwargs)
        except ApiError as error:
            return _error_response(error)

    return wrapper


@csrf_exempt
@require_http_methods(["POST"])
@_handle_api_error
def article_ai_review_api(request, article_id: int):
    article = ensure_article(article_id)
    payload = _json_body(request)
    run, suggestions = get_mock_ai_client().review_article(article)
    return _success(
        {
            "article_id": article.id,
            "run": serialize_ai_review_run(run),
            "suggestions": [serialize_ai_suggestion(suggestion) for suggestion in suggestions],
        },
        status=202,
    )


@require_http_methods(["GET"])
@_handle_api_error
def article_ai_review_runs_api(request, article_id: int):
    article = ensure_article(article_id)
    return _success({"article_id": article.id, "runs": list_article_review_runs(article)})


@require_http_methods(["GET"])
@_handle_api_error
def ai_review_run_suggestions_api(request, run_id: str):
    run = ensure_review_run(run_id)
    return _success({"run_id": run.run_id, "suggestions": list_review_run_suggestions(run)})


@csrf_exempt
@require_http_methods(["POST"])
@_handle_api_error
def ai_suggestion_accept_api(request, suggestion_id: str):
    suggestion = ensure_suggestion(suggestion_id)
    accept_suggestion(suggestion)
    return _success({"suggestion": serialize_ai_suggestion(suggestion)})


@csrf_exempt
@require_http_methods(["POST"])
@_handle_api_error
def ai_suggestion_reject_api(request, suggestion_id: str):
    suggestion = ensure_suggestion(suggestion_id)
    reject_suggestion(suggestion)
    return _success({"suggestion": serialize_ai_suggestion(suggestion)})


@require_http_methods(["GET"])
@_handle_api_error
def article_analytics_api(request, article_id: int):
    article = ensure_article(article_id)
    return _success(get_article_analytics(article))


@require_http_methods(["GET"])
@_handle_api_error
def dashboard_seo_summary_api(request):
    return _success(get_seo_summary())
