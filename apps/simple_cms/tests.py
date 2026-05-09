from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from apps.media_library.models import ImageItem

from .models import Article, Category, FaqItem, SeoMetadata, Tag


class ArticleVisibilityTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Test", slug="test")

    def create_article(self, title, status, publish_date=None, slug=""):
        return Article.objects.create(
            category=self.category,
            title=title,
            slug=slug,
            body="<p>body</p>",
            status=status,
            publish_date=publish_date,
        )

    def test_list_only_shows_public_articles(self):
        self.create_article("published-now", "published")
        self.create_article(
            "published-future",
            "published",
            publish_date=timezone.now() + timedelta(hours=2),
        )
        self.create_article("draft", "draft")

        response = self.client.get(reverse("simple_cms:article_list"))

        self.assertContains(response, "published-now")
        self.assertNotContains(response, "published-future")
        self.assertNotContains(response, "draft")

    def test_detail_disallows_draft_and_future_content(self):
        draft_article = self.create_article("draft", "draft")
        future_article = self.create_article(
            "future",
            "published",
            publish_date=timezone.now() + timedelta(hours=1),
        )

        draft_response = self.client.get(
            reverse("simple_cms:article_detail", kwargs={"slug": draft_article.slug})
        )
        future_response = self.client.get(
            reverse("simple_cms:article_detail", kwargs={"slug": future_article.slug})
        )

        self.assertEqual(draft_response.status_code, 404)
        self.assertEqual(future_response.status_code, 404)

    def test_category_counter_ignores_unpublished_content(self):
        self.create_article("published", "published")
        self.create_article("draft", "draft")

        response = self.client.get(reverse("simple_cms:article_list"))
        category = response.context["categories"].get(pk=self.category.pk)

        self.assertEqual(category.article_count, 1)
        self.assertEqual(response.context["published_total"], 1)

    def test_published_article_without_publish_date_is_auto_filled(self):
        article = self.create_article("auto-time", "published", publish_date=None)
        self.assertIsNotNone(article.publish_date)
        self.assertLessEqual(article.publish_date, timezone.now())

    def test_slug_history_redirects_after_slug_change(self):
        article = self.create_article("old-title", "published")
        old_slug = article.slug

        article.slug = "new-title"
        article.save()

        response = self.client.get(
            reverse("simple_cms:article_detail", kwargs={"slug": old_slug})
        )

        self.assertEqual(response.status_code, 301)
        self.assertEqual(
            response.headers["Location"],
            reverse("simple_cms:article_detail", kwargs={"slug": "new-title"}),
        )

    def test_slug_reuse_avoids_history_collision(self):
        article = self.create_article("first", "published")
        old_slug = article.slug

        article.slug = "second"
        article.save()

        reused = self.create_article("reuse", "draft", slug=old_slug)
        self.assertNotEqual(reused.slug, old_slug)
        self.assertTrue(reused.slug.startswith(old_slug))

    def test_revision_record_is_created_on_article_update(self):
        article = self.create_article("rev", "draft")
        first_count = article.revisions.count()

        article.body = "<p>updated</p>"
        article.save()

        self.assertEqual(first_count, 1)
        self.assertEqual(article.revisions.count(), 2)
        latest = article.revisions.first()
        self.assertIn("body", latest.changed_fields)
    def test_search_filters_results(self):
        self.create_article("alpha", "published")
        self.create_article("beta", "published")

        response = self.client.get(reverse("simple_cms:article_search"), {"q": "alpha"})
        self.assertContains(response, "alpha")
        self.assertNotContains(response, "beta")

    def test_pinned_articles_order_first(self):
        normal = self.create_article("normal", "published")
        pinned = self.create_article("pinned", "published")
        pinned.is_pinned = True
        pinned.save()

        response = self.client.get(reverse("simple_cms:article_list"))
        articles = list(response.context["articles"])
        self.assertEqual(articles[0].id, pinned.id)

    def test_health_endpoint_returns_ok(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")


class ContentSeoModelTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="SEO", slug="seo")
        self.article = Article.objects.create(
            category=self.category,
            title="内容模型",
            slug="content-model",
            body="<p>legacy body</p>",
            status="draft",
        )

    def test_article_supports_tiptap_content_fields(self):
        self.article.content_json = {
            "tiptap_schema_version": "v1",
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {"blockId": "blk_intro"},
                    "content": [{"type": "text", "text": "hello"}],
                }
            ],
        }
        self.article.content_html = "<p>hello</p>"
        self.article.save()

        refreshed = Article.objects.get(pk=self.article.pk)
        self.assertEqual(refreshed.content_json["type"], "doc")
        self.assertEqual(refreshed.content_html, "<p>hello</p>")
        self.assertIn("content_json", refreshed.revisions.first().changed_fields)

    def test_article_can_bind_tags(self):
        tag = Tag.objects.create(name="SEO 基础", slug="seo-basic")

        self.article.tags.add(tag)

        self.assertEqual(list(self.article.tags.values_list("slug", flat=True)), ["seo-basic"])

    def test_seo_metadata_is_unique_per_article(self):
        metadata = SeoMetadata.objects.create(
            article=self.article,
            meta_title="优化标题",
            meta_description="优化描述",
            canonical_url="https://example.com/articles/content-model/",
        )

        self.assertEqual(metadata.article_id, self.article.id)
        self.assertEqual(str(metadata), "SEO: 内容模型")

    def test_faq_items_are_ordered_by_sort_order(self):
        later = FaqItem.objects.create(article=self.article, question="Q2", answer="A2", sort_order=20)
        earlier = FaqItem.objects.create(article=self.article, question="Q1", answer="A1", sort_order=10)

        self.assertEqual(list(self.article.faq_items.all()), [earlier, later])

    def test_image_item_supports_alt_text(self):
        image = ImageItem.objects.create(
            title="封面",
            alt_text="内容模型封面图",
            file=SimpleUploadedFile("cover.jpg", b"fake-image-bytes", content_type="image/jpeg"),
        )

        self.assertEqual(image.alt_text, "内容模型封面图")


