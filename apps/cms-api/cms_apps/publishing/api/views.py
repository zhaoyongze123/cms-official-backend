"""发布流程 API 视图。"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from cms_apps.publishing.selectors import get_article_or_none
from cms_apps.publishing.services import build_publish_result, build_seo_check_result, publish_article


def _not_found_response():
    return JsonResponse({"error": {"code": "not_found", "message": "文章不存在", "details": {}}}, status=404)


def _validation_error_response(error: ValidationError):
    if hasattr(error, "message_dict"):
        details = error.message_dict
    else:
        details = {"detail": error.messages}
    return JsonResponse({"error": {"code": "validation_error", "message": "参数校验失败", "details": details}}, status=400)


@require_http_methods(["POST"])
def seo_check_view(request, article_id):
    article = get_article_or_none(article_id)
    if article is None:
        return _not_found_response()

    result = build_seo_check_result(article)
    return JsonResponse(result)


@require_http_methods(["POST"])
def publish_article_view(request, article_id):
    try:
        article, seo_check = publish_article(article_id)
    except ValidationError as error:
        details = error.message_dict if hasattr(error, "message_dict") else {"detail": error.messages}
        if "article_id" in details:
            return _not_found_response()
        if "seo_check" in details:
            return JsonResponse(
                {
                    "error": {
                        "code": "publish_blocked_by_seo_error",
                        "message": "存在 SEO 错误，禁止发布。",
                        "details": details.get("seo_check_details", details["seo_check"]),
                    }
                },
                status=409,
            )
        return JsonResponse(
            {
                "error": {
                    "code": "publish_blocked_by_seo_error",
                    "message": "存在 SEO 错误，禁止发布。",
                    "details": details,
                }
            },
            status=409,
        )

    return JsonResponse(
        {
            "article": build_publish_result(article)["article"],
            "seo_check": seo_check,
        }
    )
