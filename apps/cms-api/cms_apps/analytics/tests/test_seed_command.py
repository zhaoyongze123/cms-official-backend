import json

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from cms_apps.analytics.models import AnalyticsSnapshot
from cms_apps.articles.models import Article, Category


class AnalyticsSeedCommandTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="SEO", slug="seo")
        self.published_article = Article.objects.create(
            category=self.category,
            title="已发布 SEO 文章",
            slug="published-seo-article",
            body="<p>published</p>",
            content_json={"type": "doc", "content": []},
            content_html="<p>published</p>",
            status="published",
        )
        self.draft_article = Article.objects.create(
            category=self.category,
            title="草稿 SEO 文章",
            slug="draft-seo-article",
            body="<p>draft</p>",
            content_json={"type": "doc", "content": []},
            content_html="<p>draft</p>",
            status="draft",
        )

    def test_seed_command_only_creates_published_article_snapshots_by_default(self):
        out = []
        call_command("seed_analytics_snapshots", "--days=3", stdout=self._buffer(out))

        self.assertEqual(AnalyticsSnapshot.objects.filter(article=self.published_article).count(), 3)
        self.assertEqual(AnalyticsSnapshot.objects.filter(article=self.draft_article).count(), 0)

        payload = json.loads("".join(out))
        self.assertEqual(payload["article_count"], 1)
        self.assertEqual(payload["results"][0]["article_id"], self.published_article.id)

    def test_seed_command_updates_existing_snapshots_instead_of_duplication(self):
        call_command("seed_analytics_snapshots", "--days=2")
        call_command("seed_analytics_snapshots", "--days=2")

        snapshots = AnalyticsSnapshot.objects.filter(article=self.published_article)
        self.assertEqual(snapshots.count(), 2)
        self.assertEqual(
            snapshots.filter(snapshot_date=timezone.localdate()).count(),
            1,
        )

    def test_seed_command_can_include_drafts(self):
        call_command("seed_analytics_snapshots", "--days=1", "--include-drafts")
        self.assertEqual(AnalyticsSnapshot.objects.filter(article=self.published_article).count(), 1)
        self.assertEqual(AnalyticsSnapshot.objects.filter(article=self.draft_article).count(), 1)

    @staticmethod
    def _buffer(target: list[str]):
        class Buffer:
            def write(self, message):
                target.append(message)

        return Buffer()
