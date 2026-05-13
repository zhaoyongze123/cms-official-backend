from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from cms_apps.analytics.models import AnalyticsSnapshot
from cms_apps.articles.models import Article


def _build_seed_metrics(article: Article, day_offset: int) -> dict[str, object]:
    base = article.id * 137 + day_offset * 29
    impressions = 800 + base
    clicks = max(12, impressions // 14)
    ctr = Decimal(clicks) / Decimal(impressions)
    average_position = Decimal("12.00") - Decimal(min(day_offset, 9)) * Decimal("0.45") + Decimal(article.id % 5) * Decimal("0.2")
    sessions = max(10, clicks - 5 + article.id * 3)
    users = max(8, sessions - max(2, article.id % 4))
    bounce_rate = Decimal("0.58") - Decimal(min(day_offset, 6)) * Decimal("0.02")
    conversions = max(1, clicks // 18)

    return {
        "impressions": impressions,
        "clicks": clicks,
        "average_position": average_position.quantize(Decimal("0.01")),
        "ctr": ctr.quantize(Decimal("0.0001")),
        "sessions": sessions,
        "users": users,
        "bounce_rate": max(Decimal("0.18"), bounce_rate).quantize(Decimal("0.0001")),
        "avg_engagement_seconds": 55 + day_offset * 7 + article.id * 3,
        "conversions": conversions,
        "notes": "通过 seed_analytics_snapshots 生成的本地开发快照。",
    }


def seed_analytics_snapshots(days: int = 7, source: str = "gsc_ga4_stub", include_drafts: bool = False) -> list[dict[str, object]]:
    article_queryset = Article.objects.all().order_by("id")
    if not include_drafts:
        article_queryset = article_queryset.published()

    today = timezone.localdate()
    results: list[dict[str, object]] = []

    for article in article_queryset:
        created_count = 0
        updated_count = 0
        for day_offset in range(days):
            snapshot_date = today - timedelta(days=day_offset)
            payload = _build_seed_metrics(article, day_offset)
            _, created = AnalyticsSnapshot.objects.update_or_create(
                article=article,
                snapshot_date=snapshot_date,
                source=source,
                defaults=payload,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        results.append(
            {
                "article_id": article.id,
                "title": article.title,
                "slug": article.slug,
                "status": article.status,
                "created_snapshots": created_count,
                "updated_snapshots": updated_count,
            }
        )

    return results
