"""Analytics API 视图。"""

from __future__ import annotations

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from cms_apps.analytics.selectors import (
    build_dashboard_audit_summary,
    build_dashboard_seo_summary,
    get_article_analytics_payload,
    get_article_analytics_queryset,
)


def _not_found_response():
    return JsonResponse({"error": {"code": "not_found", "message": "文章不存在", "details": {}}}, status=404)


@require_http_methods(["GET"])
def article_analytics_view(request, article_id):
    article = get_article_analytics_queryset().filter(pk=article_id).first()
    if article is None:
        return _not_found_response()
    return JsonResponse(get_article_analytics_payload(article))


@require_http_methods(["GET"])
def dashboard_seo_summary_view(request):
    return JsonResponse(build_dashboard_seo_summary())


@require_http_methods(["GET"])
def dashboard_audit_summary_view(request):
    return JsonResponse(build_dashboard_audit_summary())
