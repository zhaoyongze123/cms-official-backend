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
    return serialize_article(article, include_content=False)


def _serialize_ai_drive_demo(setting: SiteSetting, scene_number: int) -> dict[str, object]:
    """序列化官网 AI 网盘演示的单个固定场景。"""
    video = getattr(setting, f"homepage_ai_drive_demo_video_{scene_number}")
    highlights = str(
        getattr(setting, f"homepage_ai_drive_demo_highlights_{scene_number}") or ""
    )
    return {
        "title": getattr(setting, f"homepage_ai_drive_demo_title_{scene_number}"),
        "description": getattr(setting, f"homepage_ai_drive_demo_description_{scene_number}"),
        "highlights": [line.strip() for line in highlights.splitlines() if line.strip()],
        "video_url": video.url if video else None,
    }


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
        "homepage_ai_drive_demos": [
            _serialize_ai_drive_demo(setting, scene_number)
            for scene_number in range(1, 5)
        ],
        "contact_product_options": [
            {"name": option.name, "product_key": option.product_key}
            for option in setting.contact_product_options.filter(is_active=True)
        ],
    }
    return JsonResponse(payload)
