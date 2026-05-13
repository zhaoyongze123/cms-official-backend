from __future__ import annotations

import json
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from urllib.parse import quote

import requests
from django.utils import timezone
from google.auth.transport.requests import Request
from google.oauth2 import service_account

from cms_apps.analytics.models import CruxPageSnapshot, Ga4PageSnapshot, GoogleSearchConsoleSnapshot
from cms_apps.articles.models import Article

from .configuration import get_google_monitoring_settings, get_site_setting

GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
GSC_ENDPOINT_TEMPLATE = "https://searchconsole.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query"
GA4_ENDPOINT_TEMPLATE = "https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
CRUX_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord"


class GoogleMonitoringConfigurationError(RuntimeError):
    pass


def _build_article_public_url(article: Article, site_public_base_url: str) -> str:
    if not site_public_base_url:
        raise GoogleMonitoringConfigurationError("未配置 site_public_base_url，无法把外部监控数据映射回文章。")
    return f"{site_public_base_url}/articles/{article.slug}/"


def _get_access_token(scope: str) -> str:
    settings = get_google_monitoring_settings()
    if not settings.google_service_account_info:
        raise GoogleMonitoringConfigurationError("未配置 Google Service Account JSON。")
    credentials = service_account.Credentials.from_service_account_info(
        settings.google_service_account_info,
        scopes=[scope],
    )
    credentials.refresh(Request())
    token = str(credentials.token or "").strip()
    if not token:
        raise GoogleMonitoringConfigurationError("Google Access Token 获取失败。")
    return token


def _build_url_article_map(site_public_base_url: str) -> dict[str, Article]:
    return {
        _build_article_public_url(article, site_public_base_url): article
        for article in Article.objects.published().all()
    }


def _build_path_article_map() -> dict[str, Article]:
    mapping: dict[str, Article] = {}
    for article in Article.objects.published().all():
        mapping[f"/articles/{article.slug}/"] = article
        mapping[f"/articles/{article.slug}"] = article
    return mapping


def _decimal(value: str | int | float | Decimal, digits: str) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal(digits), rounding=ROUND_HALF_UP)


def sync_google_search_console(days: int = 7) -> dict[str, object]:
    settings = get_google_monitoring_settings()
    if not settings.google_search_console_site_url:
        raise GoogleMonitoringConfigurationError("未配置 Google Search Console Site URL。")
    token = _get_access_token(GSC_SCOPE)
    url_article_map = _build_url_article_map(settings.site_public_base_url)
    start_date = timezone.localdate() - timedelta(days=max(days - 1, 0))
    end_date = timezone.localdate()
    response = requests.post(
        GSC_ENDPOINT_TEMPLATE.format(site=quote(settings.google_search_console_site_url, safe="")),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "dimensions": ["date", "page"],
            "rowLimit": 25000,
        },
        timeout=60,
    )
    response.raise_for_status()
    rows = response.json().get("rows", [])
    synced = 0
    skipped = 0
    for row in rows:
        keys = row.get("keys", [])
        if len(keys) < 2:
            skipped += 1
            continue
        snapshot_date = keys[0]
        page_url = keys[1]
        article = url_article_map.get(page_url)
        if article is None:
            skipped += 1
            continue
        GoogleSearchConsoleSnapshot.objects.update_or_create(
            article=article,
            snapshot_date=snapshot_date,
            defaults={
                "page_url": page_url,
                "clicks": int(row.get("clicks", 0)),
                "impressions": int(row.get("impressions", 0)),
                "ctr": _decimal(row.get("ctr", 0), "0.0001"),
                "average_position": _decimal(row.get("position", 0), "0.01"),
                "source": "google_search_console",
            },
        )
        synced += 1
    return {"source": "gsc", "days": days, "synced_rows": synced, "skipped_rows": skipped, "total_rows": len(rows)}


def sync_ga4(days: int = 7) -> dict[str, object]:
    settings = get_google_monitoring_settings()
    if not settings.ga4_property_id:
        raise GoogleMonitoringConfigurationError("未配置 GA4 Property ID。")
    token = _get_access_token(GA4_SCOPE)
    path_article_map = _build_path_article_map()
    start_date = timezone.localdate() - timedelta(days=max(days - 1, 0))
    end_date = timezone.localdate()
    response = requests.post(
        GA4_ENDPOINT_TEMPLATE.format(property_id=settings.ga4_property_id),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "dateRanges": [{"startDate": start_date.isoformat(), "endDate": end_date.isoformat()}],
            "dimensions": [{"name": "date"}, {"name": "pagePath"}],
            "metrics": [
                {"name": "sessions"},
                {"name": "activeUsers"},
                {"name": "bounceRate"},
                {"name": "averageSessionDuration"},
                {"name": "conversions"},
            ],
            "limit": 100000,
        },
        timeout=60,
    )
    response.raise_for_status()
    rows = response.json().get("rows", [])
    synced = 0
    skipped = 0
    for row in rows:
        dimensions = row.get("dimensionValues", [])
        metrics = row.get("metricValues", [])
        if len(dimensions) < 2 or len(metrics) < 5:
            skipped += 1
            continue
        snapshot_date = timezone.datetime.strptime(dimensions[0].get("value", ""), "%Y%m%d").date()
        page_path = dimensions[1].get("value", "")
        article = path_article_map.get(page_path)
        if article is None:
            skipped += 1
            continue
        Ga4PageSnapshot.objects.update_or_create(
            article=article,
            snapshot_date=snapshot_date,
            defaults={
                "page_path": page_path,
                "sessions": int(float(metrics[0].get("value", 0) or 0)),
                "users": int(float(metrics[1].get("value", 0) or 0)),
                "bounce_rate": _decimal(metrics[2].get("value", 0), "0.0001"),
                "avg_engagement_seconds": int(float(metrics[3].get("value", 0) or 0)),
                "conversions": _decimal(metrics[4].get("value", 0), "0.01"),
                "source": "ga4_data_api",
            },
        )
        synced += 1
    return {"source": "ga4", "days": days, "synced_rows": synced, "skipped_rows": skipped, "total_rows": len(rows)}


def _extract_crux_metric(record: dict[str, object], name: str):
    metric = ((record.get("metrics") or {}) if isinstance(record, dict) else {}).get(name) or {}
    percentiles = metric.get("percentiles") or {}
    p75 = percentiles.get("p75")
    if p75 is None:
        return None
    if name == "cumulative_layout_shift":
        return _decimal(p75, "0.0001")
    return int(p75)


def sync_crux(days: int = 1) -> dict[str, object]:
    del days
    settings = get_google_monitoring_settings()
    if not settings.crux_api_key:
        raise GoogleMonitoringConfigurationError("未配置 CrUX / PageSpeed API Key。")
    synced = 0
    skipped = 0
    results = []
    snapshot_date = timezone.localdate()
    for article in Article.objects.published().all():
        page_url = _build_article_public_url(article, settings.site_public_base_url)
        response = requests.post(
            f"{CRUX_ENDPOINT}?key={settings.crux_api_key}",
            json={"url": page_url},
            timeout=60,
        )
        record_scope = "url"
        if response.status_code >= 400 and settings.crux_origin:
            response = requests.post(
                f"{CRUX_ENDPOINT}?key={settings.crux_api_key}",
                json={"origin": settings.crux_origin},
                timeout=60,
            )
            record_scope = "origin"
        if response.status_code >= 400:
            skipped += 1
            results.append({"article_id": article.id, "status": "skipped", "reason": response.text[:200]})
            continue
        record = response.json().get("record") or {}
        CruxPageSnapshot.objects.update_or_create(
            article=article,
            snapshot_date=snapshot_date,
            defaults={
                "page_url": page_url,
                "form_factor": str((record.get("key") or {}).get("formFactor") or "ALL"),
                "record_scope": record_scope,
                "lcp_ms": _extract_crux_metric(record, "largest_contentful_paint"),
                "inp_ms": _extract_crux_metric(record, "interaction_to_next_paint"),
                "cls_score": _extract_crux_metric(record, "cumulative_layout_shift"),
                "source": "chrome_ux_report",
            },
        )
        synced += 1
    return {"source": "crux", "synced_rows": synced, "skipped_rows": skipped, "results": results}


def update_google_sync_status(status: str, payload: dict[str, object] | str):
    setting = get_site_setting()
    setting.google_last_sync_at = timezone.now()
    setting.google_last_sync_status = status
    setting.google_last_sync_message = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False)
    setting.save(update_fields=["google_last_sync_at", "google_last_sync_status", "google_last_sync_message"])
