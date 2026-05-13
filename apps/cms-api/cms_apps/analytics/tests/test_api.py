from datetime import date
from decimal import Decimal

from django.test import TestCase

from cms_apps.analytics.models import CruxPageSnapshot, Ga4PageSnapshot, GoogleSearchConsoleSnapshot
from cms_apps.articles.models import Article, Category
from cms_apps.faq.models import FaqItem
from cms_apps.seo.models import SeoMetadata


class AnalyticsApiTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name="数据分析",
            slug="analytics",
            seo_title="数据分析",
            seo_keywords="analytics",
            seo_description="analytics 分类",
            sort_order=1,
        )
        self.article = Article.objects.create(
            category=self.category,
            title="SEO 监控文章",
            slug="seo-analytics-article",
            body="<p>analytics</p>",
            content_json={"type": "doc", "content": []},
            content_html="<p>analytics</p>",
            status="published",
        )
        self.draft_article = Article.objects.create(
            category=self.category,
            title="草稿监控文章",
            slug="draft-analytics-article",
            body="<p>draft analytics</p>",
            content_json={"type": "doc", "content": []},
            content_html="<p>draft analytics</p>",
            status="draft",
        )
        SeoMetadata.objects.create(
            article=self.article,
            meta_title="SEO 监控标题",
            meta_description="SEO 监控描述",
            canonical_url="https://www.yuncan.com/articles/seo-analytics-article/",
            robots="index,follow",
        )
        FaqItem.objects.create(
            article=self.article,
            question="SEO 监控是什么？",
            answer="这是一个 FAQ 项。",
            sort_order=1,
        )
        GoogleSearchConsoleSnapshot.objects.create(
            article=self.article,
            snapshot_date=date(2026, 5, 10),
            page_url="https://www.yuncan.com/articles/seo-analytics-article/",
            impressions=1200,
            clicks=96,
            average_position=Decimal("8.50"),
            ctr=Decimal("0.0800"),
        )
        Ga4PageSnapshot.objects.create(
            article=self.article,
            snapshot_date=date(2026, 5, 9),
            page_path="/articles/seo-analytics-article/",
            sessions=70,
            users=61,
            bounce_rate=Decimal("0.4700"),
            avg_engagement_seconds=84,
            conversions=Decimal("3.00"),
        )
        Ga4PageSnapshot.objects.create(
            article=self.article,
            snapshot_date=date(2026, 5, 10),
            page_path="/articles/seo-analytics-article/",
            sessions=88,
            users=74,
            bounce_rate=Decimal("0.4200"),
            avg_engagement_seconds=97,
            conversions=Decimal("5.00"),
        )
        CruxPageSnapshot.objects.create(
            article=self.article,
            snapshot_date=date(2026, 5, 10),
            page_url="https://www.yuncan.com/articles/seo-analytics-article/",
            lcp_ms=2100,
            inp_ms=180,
            cls_score=Decimal("0.0300"),
        )
        GoogleSearchConsoleSnapshot.objects.create(
            article=self.article,
            snapshot_date=date(2026, 5, 9),
            page_url="https://www.yuncan.com/articles/seo-analytics-article/",
            impressions=980,
            clicks=72,
            average_position=Decimal("9.20"),
            ctr=Decimal("0.0735"),
        )

    def test_get_article_analytics_returns_latest_snapshot_and_history(self):
        response = self.client.get(f"/api/articles/{self.article.id}/analytics/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["article"]["article_id"], self.article.id)
        self.assertEqual(payload["article"]["slug"], self.article.slug)
        self.assertEqual(payload["latest_snapshot"]["snapshot_date"], "2026-05-10")
        self.assertEqual(payload["latest_snapshot"]["impressions"], 1200)
        self.assertEqual(payload["latest_snapshot"]["clicks"], 96)
        self.assertEqual(payload["latest_snapshot"]["average_position"], 8.5)
        self.assertEqual(payload["latest_snapshot"]["ctr"], 0.08)
        self.assertEqual(payload["latest_snapshot"]["sessions"], 88)
        self.assertEqual(payload["latest_snapshot"]["web_vitals"]["lcp_ms"], 2100)
        self.assertEqual(len(payload["snapshots"]), 2)
        self.assertEqual(payload["snapshots"][1]["snapshot_date"], "2026-05-09")
        self.assertEqual(payload["snapshots"][1]["sessions"], 70)

    def test_get_article_analytics_returns_404_for_missing_article(self):
        response = self.client.get("/api/articles/999999/analytics/")
        self.assertEqual(response.status_code, 404)

    def test_dashboard_seo_summary_returns_real_aggregates(self):
        response = self.client.get("/api/dashboard/seo-summary/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["totals"]["total_articles"], 2)
        self.assertEqual(payload["totals"]["published_articles"], 1)
        self.assertEqual(payload["totals"]["draft_articles"], 1)
        self.assertEqual(payload["totals"]["articles_with_seo_metadata"], 1)
        self.assertEqual(payload["totals"]["articles_with_faq"], 1)
        self.assertEqual(payload["totals"]["articles_with_analytics"], 1)
        self.assertEqual(payload["performance"]["tracked_impressions"], 1200)
        self.assertEqual(payload["performance"]["tracked_clicks"], 96)
        self.assertEqual(payload["performance"]["tracked_sessions"], 88)
        self.assertEqual(payload["performance"]["tracked_users"], 74)
        self.assertEqual(payload["performance"]["tracked_conversions"], 5)
        self.assertEqual(payload["performance"]["average_position"], 8.5)
        self.assertEqual(payload["performance"]["average_ctr"], 0.08)
        self.assertEqual(len(payload["top_articles"]), 1)
        self.assertEqual(payload["top_articles"][0]["article_id"], self.article.id)
