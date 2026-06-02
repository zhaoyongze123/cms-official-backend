import json
from email.message import Message
from datetime import timedelta
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.simple_cms.admin import ArticleAdmin
from apps.simple_cms.admin_views import next_editor_proxy
from apps.media_library.models import ImageItem

from cms_apps.articles.models import Article, Category, Tag
from cms_apps.faq.models import FaqItem
from cms_apps.knowledge.models import KnowledgeChunk, KnowledgeSource
from cms_apps.seo.models import SeoMetadata
from .rag import deterministic_embedding, search_knowledge


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

    def test_article_detail_prefers_content_html_over_legacy_body(self):
        self.article.body = "<p>legacy body</p>"
        self.article.content_html = (
            '<figure><img src="/media/demo.png" alt="示例图片" '
            'width="420" height="280" style="width:420px;height:280px;max-width:100%;" /></figure>'
        )
        self.article.status = "published"
        self.article.save()

        response = self.client.get(self.article.get_absolute_url())

        self.assertContains(response, 'width="420"')
        self.assertContains(response, 'height="280"')
        self.assertContains(response, 'style="width:420px;height:280px;max-width:100%;"')
        self.assertNotContains(response, "legacy body")

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


class RagIndexTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="SEO", slug="seo")
        self.tag = Tag.objects.create(name="Schema", slug="schema")
        self.article = Article.objects.create(
            category=self.category,
            title="SEO Schema 指南",
            slug="seo-schema-guide",
            body="<p>Schema 标记可以帮助搜索引擎理解页面主题。</p><p>SEO 结构化数据需要结合业务语义。</p>",
            content_html="<h1>SEO Schema 指南</h1><p>Schema 标记可以帮助搜索引擎理解页面主题。</p><p>SEO 结构化数据需要结合业务语义。</p>",
            meta_description="介绍 SEO Schema 与结构化数据实践。",
            status="published",
        )
        self.article.tags.add(self.tag)

    def test_deterministic_embedding_returns_expected_dimensions(self):
        vector = deterministic_embedding("schema seo")

        self.assertEqual(len(vector), 1536)
        self.assertTrue(any(value != 0 for value in vector))

    def test_rebuild_knowledge_index_command_creates_source_and_chunks(self):
        out: list[str] = []
        call_command("rebuild_knowledge_index", "--source", "article", stdout=self._writer(out))

        payload = json.loads("".join(out))
        self.assertEqual(payload["source"], "article")
        self.assertEqual(payload["indexed_count"], 1)
        self.assertEqual(KnowledgeSource.objects.count(), 1)
        self.assertGreater(KnowledgeChunk.objects.count(), 0)

        source = KnowledgeSource.objects.get(source_type="article", source_id=self.article.id)
        self.assertEqual(source.title, "SEO Schema 指南")
        self.assertEqual(source.url, self.article.get_absolute_url())
        self.assertIsNotNone(source.last_indexed_at)

    def test_rebuild_knowledge_index_dry_run_does_not_write_database(self):
        out: list[str] = []
        call_command("rebuild_knowledge_index", "--source", "article", "--dry-run", stdout=self._writer(out))

        payload = json.loads("".join(out))
        self.assertTrue(payload["dry_run"])
        self.assertEqual(KnowledgeSource.objects.count(), 0)
        self.assertEqual(KnowledgeChunk.objects.count(), 0)

    def test_rag_query_command_returns_ranked_chunks(self):
        call_command("rebuild_knowledge_index", "--source", "article")

        out: list[str] = []
        call_command("rag_query", "Schema", "--limit", "2", stdout=self._writer(out))
        payload = json.loads("".join(out))

        self.assertEqual(payload["rag_schema_version"], "v1")
        self.assertEqual(payload["query"], "Schema")
        self.assertLessEqual(len(payload["chunks"]), 2)
        self.assertGreater(len(payload["chunks"]), 0)
        self.assertEqual(payload["chunks"][0]["source_type"], "article")
        self.assertTrue(payload["chunks"][0]["text"])

    def test_search_knowledge_returns_scored_chunks(self):
        call_command("rebuild_knowledge_index", "--source", "article")

        chunks = search_knowledge("结构化数据", limit=3)

        self.assertGreater(len(chunks), 0)
        self.assertIsNotNone(getattr(chunks[0], "score", None))
        self.assertEqual(chunks[0].source.source_type, "article")

    @staticmethod
    def _writer(chunks: list[str]):
        class Writer:
            def write(self, value):
                chunks.append(value)

        return Writer()


class _FakeUpstreamResponse:
    def __init__(self, body: bytes):
        self.status = 200
        self._body = body
        self.headers = Message()
        self.headers["Content-Type"] = "application/json"

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


@override_settings(NEXT_EDITOR_INTERNAL_URL="http://editor-web:3000")
class NextEditorProxyTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @patch("apps.simple_cms.admin_views.DIRECT_PROXY_OPENER.open")
    def test_patch_proxy_forwards_request_body(self, mocked_open):
        mocked_open.return_value = _FakeUpstreamResponse(b'{"ok": true}')
        payload = {
            "title": "代理保存测试",
            "content_json": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "attrs": {"blockId": "blk_proxy_test_1"},
                        "content": [{"type": "text", "text": "代理层必须转发 PATCH body"}],
                    }
                ],
            },
        }
        request = self.factory.patch(
            "/django-admin/next-editor/api/articles/3/",
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_ACCEPT="application/json",
        )

        response = next_editor_proxy(request, "api/articles/3/")

        upstream_request = mocked_open.call_args.args[0]
        self.assertEqual(upstream_request.get_method(), "PATCH")
        self.assertEqual(upstream_request.data, request.body)
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"ok": True})


@override_settings(ROOT_URLCONF="config.urls")
class ArticleAdminEditorUrlTests(SimpleTestCase):
    @override_settings(NEXT_PUBLIC_EDITOR_BASE_URL="http://127.0.0.1:3000")
    def test_build_next_editor_url_prefers_public_editor_origin(self):
        url = ArticleAdmin._build_next_editor_url("/django-admin/articles/17/")

        self.assertEqual(
            url,
            "http://127.0.0.1:3000/django-admin/next-editor/django-admin/articles/17/",
        )

    @override_settings(NEXT_PUBLIC_EDITOR_BASE_URL="")
    def test_build_next_editor_url_falls_back_to_proxy(self):
        url = ArticleAdmin._build_next_editor_url("/django-admin/articles/new/")

        self.assertEqual(url, "/django-admin/next-editor/django-admin/articles/new/")
