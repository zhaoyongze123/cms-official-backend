"""公开站点设置 API 视图。"""

from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from cms_apps.articles.api.services import serialize_article
from cms_apps.articles.api.selectors import get_public_article_queryset
from apps.sys_settings.models import SiteSetting


def _get_site_setting() -> SiteSetting:
    setting, _ = SiteSetting.objects.get_or_create(id=1)
    return setting


def _serialize_featured_article(article_id: int | None):
    if not article_id:
        return None
    article = get_public_article_queryset().filter(pk=article_id).first()
    if article is None:
        return None
    return serialize_article(article)


@require_http_methods(["GET"])
def public_site_setting_view(request):
    setting = _get_site_setting()
    payload = {
        "site_title": setting.site_title,
        "seo_description": setting.seo_description,
        "third_party_scripts": {
            "head": setting.third_party_head_scripts,
            "body_end": setting.third_party_body_end_scripts,
        },
        "homepage_featured_articles": [
            _serialize_featured_article(setting.homepage_featured_article_primary_id),
            _serialize_featured_article(setting.homepage_featured_article_secondary_id),
            _serialize_featured_article(setting.homepage_featured_article_tertiary_id),
        ],
        "homepage_solution_articles": [
            _serialize_featured_article(setting.homepage_solution_article_1_id),
            _serialize_featured_article(setting.homepage_solution_article_2_id),
            _serialize_featured_article(setting.homepage_solution_article_3_id),
            _serialize_featured_article(setting.homepage_solution_article_4_id),
        ],
        "homepage_case_logo_wall_image_url": (
            setting.homepage_case_logo_wall_image.url
            if setting.homepage_case_logo_wall_image
            else None
        ),
    }
    return JsonResponse(payload)
