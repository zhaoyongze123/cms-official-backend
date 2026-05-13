from __future__ import annotations

import json
from dataclasses import dataclass

from apps.sys_settings.models import SiteSetting


@dataclass
class GoogleMonitoringSettings:
    site_public_base_url: str
    google_service_account_info: dict[str, object] | None
    google_search_console_site_url: str
    ga4_property_id: str
    crux_api_key: str
    crux_origin: str


def get_site_setting() -> SiteSetting:
    setting, _ = SiteSetting.objects.get_or_create(id=1)
    return setting


def get_google_monitoring_settings() -> GoogleMonitoringSettings:
    setting = get_site_setting()
    service_account_info = None
    raw_json = (setting.google_service_account_json or "").strip()
    if raw_json:
        service_account_info = json.loads(raw_json)
    return GoogleMonitoringSettings(
        site_public_base_url=(setting.site_public_base_url or "").rstrip("/"),
        google_service_account_info=service_account_info,
        google_search_console_site_url=(setting.google_search_console_site_url or "").strip(),
        ga4_property_id=(setting.ga4_property_id or "").strip(),
        crux_api_key=(setting.crux_api_key or "").strip(),
        crux_origin=(setting.crux_origin or "").rstrip("/"),
    )
