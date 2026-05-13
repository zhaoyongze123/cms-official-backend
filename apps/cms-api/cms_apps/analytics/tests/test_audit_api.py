from datetime import date
from decimal import Decimal

from django.test import TestCase

from cms_apps.analytics.models import Ga4PageSnapshot, GoogleSearchConsoleSnapshot
from cms_apps.articles.models import Article, Category


class AnalyticsAuditApiTests(TestCase):
    def setUp(self):
        category = Category.objects.create(name="SEO", slug="seo")
        self.article = Article.objects.create(
            category=category,
            title="短标题",
            slug="short-title",
            body="<p>body</p>",
            content_json={"type": "doc", "content": []},
            content_html="<p>body</p>",
            status="draft",
        )
        GoogleSearchConsoleSnapshot.objects.create(
            article=self.article,
            snapshot_date=date(2026, 5, 10),
            page_url="https://www.example.com/articles/short-title/",
            impressions=100,
            clicks=10,
            ctr=Decimal("0.1000"),
            average_position=Decimal("25.00"),
        )
        Ga4PageSnapshot.objects.create(
            article=self.article,
            snapshot_date=date(2026, 5, 10),
            page_path="/articles/short-title/",
            sessions=9,
            users=8,
            bounce_rate=Decimal("0.5000"),
            avg_engagement_seconds=40,
            conversions=Decimal("0.00"),
        )

    def test_dashboard_audit_summary_returns_backend_audit_rows(self):
        response = self.client.get("/api/dashboard/seo-audit/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["rows"]), 1)
        self.assertEqual(payload["rows"][0]["article"]["article_id"], self.article.id)
        self.assertGreaterEqual(payload["rows"][0]["audit"]["score"], 0)
        self.assertTrue(any(alert["code"] == "status_not_published" for alert in payload["alerts"]))
