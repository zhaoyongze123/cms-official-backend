from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from django.db.models import Count, Prefetch

from cms_apps.analytics.models import CruxPageSnapshot, Ga4PageSnapshot, GoogleSearchConsoleSnapshot
from cms_apps.articles.models import Article


def get_article_analytics_queryset():
    return Article.objects.select_related("category", "seo_metadata").prefetch_related(
        "tags",
        Prefetch("gsc_snapshots", queryset=GoogleSearchConsoleSnapshot.objects.order_by("-snapshot_date", "-id")),
        Prefetch("ga4_snapshots", queryset=Ga4PageSnapshot.objects.order_by("-snapshot_date", "-id")),
        Prefetch("crux_snapshots", queryset=CruxPageSnapshot.objects.order_by("-snapshot_date", "-id")),
    )


def _decimal_to_float(value: Decimal | int | float | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _get_heading_count(article: Article) -> int:
    return article.content_html.lower().count("<h1")


def _get_meta_description(article: Article) -> str:
    seo_metadata = getattr(article, "seo_metadata", None)
    if seo_metadata and seo_metadata.meta_description:
        return seo_metadata.meta_description.strip()
    return str(getattr(article, "meta_description", "") or "").strip()


def _get_canonical(article: Article) -> str:
    seo_metadata = getattr(article, "seo_metadata", None)
    if seo_metadata and seo_metadata.canonical_url:
        return seo_metadata.canonical_url.strip()
    return ""


def build_article_audit(article: Article, analytics_payload: dict[str, object] | None = None) -> dict[str, object]:
    issues: list[dict[str, str]] = []
    if len((article.title or "").strip()) < 10:
        issues.append({"severity": "严重", "code": "title_short", "message": "标题过短"})
    if not _get_meta_description(article):
        issues.append({"severity": "严重", "code": "meta_missing", "message": "Meta Description 缺失"})
    if not _get_canonical(article):
        issues.append({"severity": "中等", "code": "canonical_missing", "message": "Canonical 缺失"})
    if _get_heading_count(article) != 1:
        issues.append({"severity": "中等", "code": "h1_invalid", "message": "H1 结构异常"})
    if not str(article.content_html or "").strip():
        issues.append({"severity": "严重", "code": "content_missing", "message": "正文为空"})
    if not analytics_payload or not analytics_payload.get("latest_snapshot"):
        issues.append({"severity": "轻微", "code": "analytics_missing", "message": "暂无监控快照"})
    if article.status != "published":
        issues.append({"severity": "中等", "code": "status_not_published", "message": "页面尚未发布"})
    if not getattr(article, "faq_count", 0):
        issues.append({"severity": "轻微", "code": "faq_missing", "message": "FAQ 未配置"})

    score = 100
    for issue in issues:
        if issue["severity"] == "严重":
            score -= 16
        elif issue["severity"] == "中等":
            score -= 9
        else:
            score -= 4
    latest_snapshot = analytics_payload.get("latest_snapshot") if analytics_payload else None
    if isinstance(latest_snapshot, dict) and float(latest_snapshot.get("average_position") or 0) <= 10:
        score += 4
    score = max(0, min(100, round(score)))

    recommendations: list[str] = []
    issue_codes = {issue["code"] for issue in issues}
    if "meta_missing" in issue_codes:
        recommendations.append("补充 Meta Description，优先覆盖搜索摘要。")
    if "h1_invalid" in issue_codes:
        recommendations.append("页面只保留一个 H1，其余标题降级为 H2/H3。")
    if "canonical_missing" in issue_codes:
        recommendations.append("补充 Canonical，避免重复内容分散权重。")
    if isinstance(latest_snapshot, dict) and float(latest_snapshot.get("average_position") or 0) > 20:
        recommendations.append("当前平均排名偏后，优先优化标题、摘要和首屏内容相关性。")
    if not recommendations:
        recommendations.append("当前页面未发现高优先级结构问题，可继续跟踪排名和 CTR。")

    return {
        "score": score,
        "issues": issues,
        "primary_issue": issues[0]["message"] if issues else "状态良好",
        "recommendations": recommendations[:3],
    }


def _serialize_snapshot(
    gsc_snapshot: GoogleSearchConsoleSnapshot,
    ga4_snapshot: Ga4PageSnapshot | None,
    crux_snapshot: CruxPageSnapshot | None,
) -> dict[str, object]:
    return {
        "snapshot_id": gsc_snapshot.id,
        "snapshot_date": gsc_snapshot.snapshot_date.isoformat(),
        "source": "google_monitoring",
        "impressions": gsc_snapshot.impressions,
        "clicks": gsc_snapshot.clicks,
        "average_position": _decimal_to_float(gsc_snapshot.average_position),
        "ctr": _decimal_to_float(gsc_snapshot.ctr),
        "sessions": ga4_snapshot.sessions if ga4_snapshot else 0,
        "users": ga4_snapshot.users if ga4_snapshot else 0,
        "bounce_rate": _decimal_to_float(ga4_snapshot.bounce_rate) if ga4_snapshot else 0.0,
        "avg_engagement_seconds": ga4_snapshot.avg_engagement_seconds if ga4_snapshot else 0,
        "conversions": _decimal_to_float(ga4_snapshot.conversions) if ga4_snapshot else 0.0,
        "updated_at": max(
            [item.updated_at for item in [gsc_snapshot, ga4_snapshot, crux_snapshot] if item is not None]
        ).isoformat(),
        "web_vitals": {
            "lcp_ms": crux_snapshot.lcp_ms if crux_snapshot else None,
            "inp_ms": crux_snapshot.inp_ms if crux_snapshot else None,
            "cls_score": _decimal_to_float(crux_snapshot.cls_score) if crux_snapshot and crux_snapshot.cls_score is not None else None,
            "record_scope": crux_snapshot.record_scope if crux_snapshot else "",
            "form_factor": crux_snapshot.form_factor if crux_snapshot else "",
        },
    }


def get_article_analytics_payload(article: Article) -> dict[str, object]:
    gsc_snapshots = list(article.gsc_snapshots.all())
    ga4_by_date = {snapshot.snapshot_date: snapshot for snapshot in article.ga4_snapshots.all()}
    crux_by_date = {snapshot.snapshot_date: snapshot for snapshot in article.crux_snapshots.all()}
    snapshots = [
        _serialize_snapshot(
            gsc_snapshot,
            ga4_by_date.get(gsc_snapshot.snapshot_date),
            crux_by_date.get(gsc_snapshot.snapshot_date),
        )
        for gsc_snapshot in gsc_snapshots
    ]
    latest_snapshot = snapshots[0] if snapshots else None

    return {
        "article": {
            "article_id": article.id,
            "title": article.title,
            "slug": article.slug,
            "status": article.status,
            "published_at": article.publish_date.isoformat() if article.publish_date else None,
        },
        "latest_snapshot": latest_snapshot,
        "snapshots": snapshots,
    }


def build_dashboard_seo_summary() -> dict[str, object]:
    articles = list(
        get_article_analytics_queryset().annotate(
            faq_count=Count("faq_items", distinct=True),
        )
    )
    totals = {
        "total_articles": len(articles),
        "published_articles": 0,
        "draft_articles": 0,
        "archived_articles": 0,
        "articles_with_seo_metadata": 0,
        "articles_with_faq": 0,
        "articles_with_analytics": 0,
    }
    aggregate = defaultdict(float)
    top_articles = []

    for article in articles:
        totals_key = f"{article.status}_articles"
        if totals_key in totals:
            totals[totals_key] += 1
        if getattr(article, "seo_metadata", None) is not None:
            totals["articles_with_seo_metadata"] += 1
        if getattr(article, "faq_count", 0) > 0:
            totals["articles_with_faq"] += 1

        gsc_snapshots = list(article.gsc_snapshots.all())
        if not gsc_snapshots:
            continue

        ga4_by_date = {snapshot.snapshot_date: snapshot for snapshot in article.ga4_snapshots.all()}
        totals["articles_with_analytics"] += 1
        latest = gsc_snapshots[0]
        latest_ga4 = ga4_by_date.get(latest.snapshot_date)
        aggregate["tracked_impressions"] += latest.impressions
        aggregate["tracked_clicks"] += latest.clicks
        aggregate["tracked_sessions"] += latest_ga4.sessions if latest_ga4 else 0
        aggregate["tracked_users"] += latest_ga4.users if latest_ga4 else 0
        aggregate["tracked_conversions"] += _decimal_to_float(latest_ga4.conversions) if latest_ga4 else 0
        aggregate["total_position"] += _decimal_to_float(latest.average_position)
        aggregate["total_ctr"] += _decimal_to_float(latest.ctr)

        top_articles.append(
            {
                "article_id": article.id,
                "title": article.title,
                "slug": article.slug,
                "status": article.status,
                "impressions": latest.impressions,
                "clicks": latest.clicks,
                "sessions": latest_ga4.sessions if latest_ga4 else 0,
                "average_position": _decimal_to_float(latest.average_position),
                "ctr": _decimal_to_float(latest.ctr),
                "snapshot_date": latest.snapshot_date.isoformat(),
            }
        )

    tracked_count = totals["articles_with_analytics"]
    average_position = round(aggregate["total_position"] / tracked_count, 2) if tracked_count else 0.0
    average_ctr = round(aggregate["total_ctr"] / tracked_count, 4) if tracked_count else 0.0

    return {
        "totals": totals,
        "performance": {
            "tracked_impressions": int(aggregate["tracked_impressions"]),
            "tracked_clicks": int(aggregate["tracked_clicks"]),
            "tracked_sessions": int(aggregate["tracked_sessions"]),
            "tracked_users": int(aggregate["tracked_users"]),
            "tracked_conversions": int(aggregate["tracked_conversions"]),
            "average_position": average_position,
            "average_ctr": average_ctr,
        },
        "top_articles": sorted(top_articles, key=lambda item: item["impressions"], reverse=True)[:5],
    }


def build_dashboard_audit_summary() -> dict[str, object]:
    articles = list(
        get_article_analytics_queryset().annotate(
            faq_count=Count("faq_items", distinct=True),
        )
    )
    rows = []
    for article in articles:
        analytics_payload = get_article_analytics_payload(article)
        audit = build_article_audit(article, analytics_payload)
        rows.append(
            {
                "article": {
                    "article_id": article.id,
                    "title": article.title,
                    "slug": article.slug,
                    "status": article.status,
                },
                "analytics": analytics_payload,
                "audit": audit,
            }
        )

    alert_map: dict[str, dict[str, object]] = {}
    definitions = {
        "meta_missing": {"severity": "严重", "title": "Meta Description 缺失", "action": "自动生成"},
        "title_short": {"severity": "严重", "title": "标题过短", "action": "查看"},
        "canonical_missing": {"severity": "中等", "title": "Canonical 缺失", "action": "修复建议"},
        "h1_invalid": {"severity": "中等", "title": "H1 结构异常", "action": "查看"},
        "analytics_missing": {"severity": "轻微", "title": "未接入监控快照", "action": "查看"},
        "faq_missing": {"severity": "轻微", "title": "FAQ 未配置", "action": "补充 FAQ"},
        "status_not_published": {"severity": "中等", "title": "未发布页面", "action": "批量处理"},
    }
    for row in rows:
        for issue in row["audit"]["issues"]:
            issue_code = issue["code"]
            if issue_code not in definitions:
                continue
            current = alert_map.get(issue_code) or {"code": issue_code, "count": 0, **definitions[issue_code]}
            current["count"] += 1
            alert_map[issue_code] = current

    severity_order = {"严重": 0, "中等": 1, "轻微": 2}
    alerts = sorted(
        alert_map.values(),
        key=lambda item: (severity_order[str(item["severity"])], -int(item["count"])),
    )[:6]
    return {"rows": rows, "alerts": alerts}
