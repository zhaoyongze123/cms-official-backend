"""公开站点设置 API 视图。"""

from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from apps.sys_settings.models import SiteSetting


def _get_site_setting() -> SiteSetting:
    setting, _ = SiteSetting.objects.get_or_create(id=1)
    return setting


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
    }
    return JsonResponse(payload)
