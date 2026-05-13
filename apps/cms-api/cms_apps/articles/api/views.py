"""文章 API 视图。"""

from __future__ import annotations

import json

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from cms_apps.articles.api.selectors import get_article_queryset, get_public_article_queryset
from cms_apps.articles.api.services import apply_article_payload, serialize_article
from cms_apps.articles.models import Article, ArticleSlugHistory, Category, Tag
from cms_apps.seo.services.public import (
    build_article_breadcrumb_json_ld,
    build_article_canonical_url,
    build_article_faq_json_ld,
    serialize_faq_items,
)


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


@require_http_methods(["GET", "POST"])
@csrf_exempt
def article_list_view(request):
    if request.method == "GET":
        articles = get_article_queryset().all().order_by("-updated_at", "-id")
        return JsonResponse([serialize_article(article) for article in articles], safe=False)

    try:
        payload = _parse_json_body(request)
        article = Article()
        apply_article_payload(article, payload, partial=False)
    except ValidationError as error:
        return _validation_error_response(error)

    article = get_article_queryset().get(pk=article.pk)
    return JsonResponse(serialize_article(article), status=201)


@require_http_methods(["GET", "PATCH"])
@csrf_exempt
def article_detail_view(request, article_id):
    article = get_object_or_404(get_article_queryset(), pk=article_id)

    if request.method == "GET":
        return JsonResponse(serialize_article(article))

    try:
        payload = _parse_json_body(request)
        apply_article_payload(article, payload, partial=True)
    except ValidationError as error:
        return _validation_error_response(error)

    article = get_article_queryset().get(pk=article.pk)
    return JsonResponse(serialize_article(article))


@require_http_methods(["GET"])
def public_article_list_view(request):
    articles = get_public_article_queryset()
    return JsonResponse([serialize_article(article) for article in articles], safe=False)


@require_http_methods(["GET"])
def public_article_detail_by_slug_view(request, slug):
    article = get_public_article_queryset().filter(slug=slug).first()
    if article is not None:
        seo_metadata = getattr(article, "seo_metadata", None)
        faq_json_ld = build_article_faq_json_ld(article)
        seo_payload = {
            "canonical_url_resolved": build_article_canonical_url(request, article, seo_metadata),
            "faq_items": serialize_faq_items(article),
            "json_ld": {
                "breadcrumb": build_article_breadcrumb_json_ld(request, article),
                "faq": faq_json_ld,
            },
        }
        return JsonResponse(serialize_article(article, seo_payload=seo_payload))

    history = ArticleSlugHistory.objects.select_related("article").filter(slug=slug).first()
    if history and get_public_article_queryset().filter(pk=history.article_id).exists():
        response = JsonResponse({"redirect_to": history.article.slug}, status=301)
        response["Location"] = f"/api/public/articles/{history.article.slug}/"
        return response

    return _not_found_response()


@require_http_methods(["GET"])
def tag_list_view(request):
    query = (request.GET.get("q") or "").strip()
    queryset = Tag.objects.all().order_by("name")
    if query:
        queryset = queryset.filter(name__icontains=query)

    items = [
        {
            "tag_id": tag.id,
            "name": tag.name,
            "slug": tag.slug,
        }
        for tag in queryset[:20]
    ]
    return JsonResponse(items, safe=False)


@require_http_methods(["GET"])
def category_list_view(request):
    query = (request.GET.get("q") or "").strip()
    queryset = Category.objects.all().order_by("sort_order", "name", "id")
    if query:
        queryset = queryset.filter(name__icontains=query)

    items = [
        {
            "category_id": category.id,
            "name": category.name,
            "slug": category.slug,
        }
        for category in queryset[:20]
    ]
    return JsonResponse(items, safe=False)
