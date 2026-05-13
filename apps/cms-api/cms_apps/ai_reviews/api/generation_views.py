"""AI 生成 API 视图。"""

from __future__ import annotations

import json

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from cms_apps.ai_reviews.services.tasks import (
    generate_alt_with_fastapi,
    generate_description_with_fastapi,
    generate_metadata_with_fastapi,
    generate_slug_with_fastapi,
    generate_tags_with_fastapi,
    generate_title_with_fastapi,
)
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


def _not_found_response():
    return JsonResponse({"error": {"code": "not_found", "message": "文章不存在", "details": {}}}, status=404)


@require_http_methods(["POST"])
@csrf_exempt
def ai_generate_metadata_view(request, article_id):
    article = get_article_queryset().filter(pk=article_id).first()
    if article is None:
        return _not_found_response()

    try:
        payload = _parse_json_body(request)
        response = generate_metadata_with_fastapi(article, payload)
    except ValidationError as error:
        return _validation_error_response(error)
    except Exception as error:
        return JsonResponse(
            {
                "error": {
                    "code": "ai_generation_service_error",
                    "message": "AI Metadata 生成失败",
                    "details": {"reason": str(error)},
                }
            },
            status=502,
        )

    return JsonResponse(response, status=200)


def _generate_single_field_view(request, article_id, generator):
    article = get_article_queryset().filter(pk=article_id).first()
    if article is None:
        return _not_found_response()

    try:
        payload = _parse_json_body(request)
        response = generator(article, payload)
    except ValidationError as error:
        return _validation_error_response(error)
    except Exception as error:
        return JsonResponse(
            {
                "error": {
                    "code": "ai_generation_service_error",
                    "message": "AI 单字段生成失败",
                    "details": {"reason": str(error)},
                }
            },
            status=502,
        )

    return JsonResponse(response, status=200)


@require_http_methods(["POST"])
@csrf_exempt
def ai_generate_title_view(request, article_id):
    return _generate_single_field_view(request, article_id, generate_title_with_fastapi)


@require_http_methods(["POST"])
@csrf_exempt
def ai_generate_slug_view(request, article_id):
    return _generate_single_field_view(request, article_id, generate_slug_with_fastapi)


@require_http_methods(["POST"])
@csrf_exempt
def ai_generate_tags_view(request, article_id):
    return _generate_single_field_view(request, article_id, generate_tags_with_fastapi)


@require_http_methods(["POST"])
@csrf_exempt
def ai_generate_description_view(request, article_id):
    return _generate_single_field_view(request, article_id, generate_description_with_fastapi)


@require_http_methods(["POST"])
@csrf_exempt
def ai_generate_alt_view(request, article_id):
    return _generate_single_field_view(request, article_id, generate_alt_with_fastapi)
