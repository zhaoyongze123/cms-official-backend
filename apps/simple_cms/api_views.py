from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Article
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

BLOCK_ID_RE = re.compile(r"^blk_[A-Za-z0-9_-]+$")


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


def _build_content_hash(article: Article) -> str:
    payload = json.dumps(
        {
            "title": article.title,
            "content_json": article.content_json,
            "content_html": article.content_html,
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def _serialize_article(article: Article) -> dict[str, Any]:
    return {
        "article_id": article.id,
        "schema_version": "v1",
        "title": article.title,
        "summary": article.meta_description,
        "slug": article.slug,
        "status": article.status,
        "category": (
            {
                "category_id": article.category_id,
                "name": article.category.name,
                "slug": article.category.slug,
            }
            if article.category
            else None
        ),
        "tags": [
            {
                "tag_id": tag.id,
                "name": tag.name,
                "slug": tag.slug,
            }
            for tag in article.tags.all()
        ],
        "content_json": article.content_json
        or {
            "tiptap_schema_version": "v1",
            "type": "doc",
            "content": [],
        },
        "content_html": article.content_html,
        "content_hash": _build_content_hash(article),
        "published_at": article.publish_date.isoformat() if article.publish_date else None,
        "updated_at": article.updated_at.isoformat(),
    }


def _validate_content_json(content_json: Any) -> dict[str, Any]:
    if not isinstance(content_json, dict):
        raise ApiError("invalid_content_json", "content_json 必须是对象", status_code=400)
    if content_json.get("tiptap_schema_version") != "v1":
        raise ApiError("invalid_content_json", "tiptap_schema_version 必须为 v1", status_code=400)
    if content_json.get("type") != "doc":
        raise ApiError("invalid_content_json", "content_json.type 必须为 doc", status_code=400)

    content = content_json.get("content")
    if not isinstance(content, list):
        raise ApiError("invalid_content_json", "content_json.content 必须是数组", status_code=400)

    for node in content:
        if not isinstance(node, dict):
            raise ApiError("invalid_content_json", "content 节点必须是对象", status_code=400)
        attrs = node.get("attrs")
        if not isinstance(attrs, dict):
            raise ApiError("invalid_content_json", "每个顶层 block 必须包含 attrs", status_code=400)
        block_id = attrs.get("blockId")
        if not isinstance(block_id, str) or not BLOCK_ID_RE.match(block_id):
            raise ApiError("invalid_content_json", "顶层 block 的 blockId 不合法", status_code=400)

    return content_json


@csrf_exempt
@require_http_methods(["GET", "PATCH"])
@_handle_api_error
def article_detail_api(request, article_id: int):
    article = ensure_article(article_id)

    if request.method == "GET":
        return _success(_serialize_article(article))

    payload = _json_body(request)
    if "title" in payload:
        article.title = str(payload["title"]).strip()
    if "summary" in payload:
        article.meta_description = str(payload["summary"]).strip()
    if "slug" in payload:
        article.slug = str(payload["slug"]).strip()
    if "status" in payload:
        article.status = str(payload["status"]).strip()
    if "content_json" in payload:
        article.content_json = _validate_content_json(payload["content_json"])
    if "content_html" in payload:
        article.content_html = str(payload["content_html"])

    article.save()
    article.refresh_from_db()
    return _success(_serialize_article(article))


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
