"""文章 API 视图。"""

from __future__ import annotations

import json
import secrets
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from cms_apps.articles.api.selectors import get_article_queryset, get_public_article_queryset
from cms_apps.articles.api.services import apply_article_payload, serialize_article
from cms_apps.articles.models import Article, ArticleSlugHistory, Category, Tag
from cms_apps.seo.services.public import (
    build_article_breadcrumb_items,
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
    article = get_article_queryset().filter(pk=article_id).first()
    if article is None:
        return _not_found_response()

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
    include_content = request.GET.get("summary") != "1"
    return JsonResponse(
        [serialize_article(article, include_content=include_content) for article in articles],
        safe=False,
    )


@require_http_methods(["GET"])
def public_article_detail_by_slug_view(request, slug):
    article = get_public_article_queryset().filter(slug=slug).first()
    if article is not None:
        seo_metadata = getattr(article, "seo_metadata", None)
        faq_json_ld = build_article_faq_json_ld(article)
        seo_payload = {
            "canonical_url_resolved": build_article_canonical_url(request, article, seo_metadata),
            "faq_items": serialize_faq_items(article),
            "breadcrumbs": build_article_breadcrumb_items(request, article),
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


@require_http_methods(["POST"])
@csrf_exempt
def article_preview_link_view(request, article_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": {"code": "forbidden", "message": "需要后台编辑权限。", "details": {}}}, status=403)

    article = get_article_queryset().filter(pk=article_id).first()
    if article is None:
        return _not_found_response()
    if article.status != "draft":
        return JsonResponse({"error": {"code": "preview_requires_draft", "message": "仅草稿文章可生成预览链接。", "details": {}}}, status=409)

    now = timezone.now()
    if not article.preview_token or not article.preview_expires_at or article.preview_expires_at <= now:
        for _ in range(3):
            article.preview_token = secrets.token_urlsafe(32)
            article.preview_expires_at = now + timedelta(hours=24)
            try:
                article.save(update_fields=("preview_token", "preview_expires_at", "updated_at"))
                break
            except IntegrityError:
                continue
        else:
            return JsonResponse({"error": {"code": "preview_token_generation_failed", "message": "预览链接生成失败，请重试。", "details": {}}}, status=500)

    return JsonResponse(
        {
            "preview_path": f"/preview/articles/{article.preview_token}",
            "expires_at": article.preview_expires_at.isoformat(),
        }
    )


@require_http_methods(["GET"])
def public_article_preview_view(request, token):
    article = get_article_queryset().filter(
        status="draft",
        preview_token=token,
        preview_expires_at__gt=timezone.now(),
    ).first()
    if article is None:
        return _not_found_response()
    return JsonResponse(serialize_article(article))


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
