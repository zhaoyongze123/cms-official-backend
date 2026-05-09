import json
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client, TestCase
from django.test.utils import override_settings
from django.test.utils import override_settings
from django.urls import reverse
from django.utils import timezone

from apps.media_library.models import ImageItem

from .models import AiReviewRun, AiSuggestion, Article, Category, FaqItem, KnowledgeChunk, KnowledgeSource, SeoMetadata, Tag
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

    def test_ai_review_api_creates_run_and_suggestions(self):
        article = self.create_article("ai-review", "draft")

        response = self.client.post(
            f"/api/articles/{article.id}/ai-review/",
            data={"reason": "smoke"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 202)
        payload = response.json()
        self.assertEqual(payload["article_id"], article.id)
        self.assertIn("run", payload)
        self.assertIn("suggestions", payload)
        self.assertEqual(payload["run"]["schema_version"], "v1")
        self.assertEqual(payload["run"]["article_id"], article.id)
        self.assertEqual(payload["suggestions"][0]["schema_version"], "v1")
        self.assertEqual(payload["suggestions"][0]["status"], "pending")
        self.assertEqual(payload["suggestions"][0]["patches"][0]["patch_schema_version"], "v1")
        self.assertTrue(payload["suggestions"][0]["patches"][0]["content_hash"].startswith("sha256:"))
        self.assertEqual(AiReviewRun.objects.filter(article=article).count(), 1)
        self.assertEqual(AiSuggestion.objects.filter(article=article).count(), 1)

    def test_ai_review_runs_api_lists_history(self):
        article = self.create_article("ai-review-history", "draft")
        self.client.post(f"/api/articles/{article.id}/ai-review/", data={}, content_type="application/json")

        response = self.client.get(f"/api/articles/{article.id}/ai-review-runs/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["article_id"], article.id)
        self.assertEqual(len(payload["runs"]), 1)
        self.assertEqual(payload["runs"][0]["status"], "completed")

    def test_ai_review_run_suggestions_api_lists_suggestions(self):
        article = self.create_article("ai-review-suggestions", "draft")
        create_response = self.client.post(
            f"/api/articles/{article.id}/ai-review/",
            data={},
            content_type="application/json",
        )
        run_id = create_response.json()["run"]["run_id"]

        response = self.client.get(f"/api/ai-review-runs/{run_id}/suggestions/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["run_id"], run_id)
        self.assertEqual(len(payload["suggestions"]), 1)
        self.assertEqual(payload["suggestions"][0]["type"], "body_replace")

    def test_accept_and_reject_suggestion_api_updates_status(self):
        article = self.create_article("ai-review-status", "draft")
        create_response = self.client.post(
            f"/api/articles/{article.id}/ai-review/",
            data={},
            content_type="application/json",
        )
        suggestion_id = create_response.json()["suggestions"][0]["suggestion_id"]

        accept_response = self.client.post(f"/api/ai-suggestions/{suggestion_id}/accept/")
        self.assertEqual(accept_response.status_code, 200)
        self.assertEqual(accept_response.json()["suggestion"]["status"], "accepted")

        reject_response = self.client.post(f"/api/ai-suggestions/{suggestion_id}/reject/")
        self.assertEqual(reject_response.status_code, 200)
        self.assertEqual(reject_response.json()["suggestion"]["status"], "rejected")

        suggestion = AiSuggestion.objects.get(suggestion_id=suggestion_id)
        self.assertEqual(suggestion.status, "rejected")

    def test_ai_review_api_returns_not_found_for_missing_article(self):
        response = self.client.post("/api/articles/999999/ai-review/", data={}, content_type="application/json")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "article_not_found")

    def test_ai_review_api_allows_direct_post_without_csrf_cookie(self):
        article = self.create_article("ai-review-csrf", "draft")
        csrf_client = Client(enforce_csrf_checks=True)

        response = csrf_client.post(
            f"/api/articles/{article.id}/ai-review/",
            data=json.dumps({"reason": "csrf-smoke"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 202)


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


class ArticleSeoRendererTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name="SEO 渲染",
            slug="seo-renderer",
            seo_title="SEO 渲染",
            seo_keywords="SEO, 渲染",
            seo_description="用于验证 SEO 输出的分类",
        )

    def create_published_article(self, title, slug, body, publish_date=None):
        return Article.objects.create(
            category=self.category,
            title=title,
            slug=slug,
            body=body,
            status="published",
            publish_date=publish_date,
        )

    def test_detail_page_exposes_seo_context_for_renderer(self):
        article = self.create_published_article(
            title="SEO 详情页",
            slug="seo-detail",
            body="<h2>概览</h2><p>正文内容。</p>",
        )
        SeoMetadata.objects.create(
            article=article,
            meta_title="SEO 详情页标题",
            meta_description="SEO 详情页描述",
            canonical_url="https://example.com/seo-detail/",
            robots="index,follow",
            og_title="SEO 详情页 OG 标题",
            og_description="SEO 详情页 OG 描述",
        )

        response = self.client.get(reverse("simple_cms:article_detail", kwargs={"slug": article.slug}))

        self.assertEqual(response.status_code, 200)
        self.assertIn("seo_context", response.context)
        self.assertEqual(response.context["seo_context"]["title"], "SEO 详情页标题")
        self.assertEqual(response.context["seo_context"]["description"], "SEO 详情页描述")
        self.assertEqual(response.context["seo_context"]["canonical"], "https://example.com/seo-detail/")
        self.assertEqual(response.context["seo_context"]["robots"], "index,follow")
        self.assertIn("og", response.context["seo_context"])
        self.assertIn("twitter", response.context["seo_context"])
        self.assertIn("json_ld", response.context["seo_context"])

    def test_detail_page_renders_canonical_robots_og_and_json_ld(self):
        article = self.create_published_article(
            title="页面级 SEO",
            slug="page-seo",
            body="<h2>一级标题</h2><p>正文内容。</p>",
        )
        SeoMetadata.objects.create(
            article=article,
            meta_title="页面级 SEO 标题",
            meta_description="页面级 SEO 描述",
            canonical_url="https://example.com/page-seo/",
            robots="index,follow",
            og_title="页面级 OG 标题",
            og_description="页面级 OG 描述",
        )

        response = self.client.get(reverse("simple_cms:article_detail", kwargs={"slug": article.slug}))

        self.assertContains(response, '<link rel="canonical"', html=False)
        self.assertContains(response, '<meta name="robots" content="index,follow"', html=False)
        self.assertContains(response, 'property="og:title"', html=False)
        self.assertContains(response, 'property="og:description"', html=False)
        self.assertContains(response, 'property="og:url"', html=False)
        self.assertContains(response, 'property="og:type"', html=False)
        self.assertContains(response, 'application/ld+json', html=False)

    def test_detail_page_renders_faq_schema_when_faq_items_exist(self):
        article = self.create_published_article(
            title="FAQ 详情页",
            slug="faq-detail",
            body="<h2>常见问题</h2><p>正文内容。</p>",
        )
        FaqItem.objects.create(article=article, question="如何开始？", answer="先完成基础配置。", sort_order=10)
        FaqItem.objects.create(article=article, question="如何发布？", answer="审核通过后发布。", sort_order=20)

        response = self.client.get(reverse("simple_cms:article_detail", kwargs={"slug": article.slug}))

        self.assertContains(response, '"@type": "FAQPage"', html=False)
        self.assertContains(response, "如何开始？", html=False)
        self.assertContains(response, "如何发布？", html=False)
        self.assertContains(response, "application/ld+json", html=False)

    def test_detail_page_exposes_toc_items_for_heading_rendering(self):
        article = self.create_published_article(
            title="TOC 详情页",
            slug="toc-detail",
            body="<h2>第一节</h2><p>正文内容。</p><h3>第二节</h3><p>更多内容。</p>",
        )

        response = self.client.get(reverse("simple_cms:article_detail", kwargs={"slug": article.slug}))

        self.assertEqual(response.status_code, 200)
        self.assertIn("toc_items", response.context)
        self.assertEqual(len(response.context["toc_items"]), 2)
        self.assertEqual(response.context["toc_items"][0]["title"], "第一节")
        self.assertEqual(response.context["toc_items"][1]["title"], "第二节")

    @override_settings(APPEND_SLASH=False)
    def test_sitemap_xml_only_includes_published_articles(self):
        published = self.create_published_article(
            title="已发布页面",
            slug="published-page",
            body="<p>已发布内容。</p>",
        )
        self.create_published_article(
            title="未来页面",
            slug="future-page",
            body="<p>未来内容。</p>",
            publish_date=timezone.now() + timedelta(days=1),
        )
        Article.objects.create(
            category=self.category,
            title="草稿页面",
            slug="draft-page",
            body="<p>草稿内容。</p>",
            status="draft",
        )

        response = self.client.get("/sitemap.xml")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"].split(";")[0], "application/xml")
        self.assertContains(response, published.get_absolute_url(), html=False)
        self.assertNotContains(response, "future-page")
        self.assertNotContains(response, "draft-page")

    def test_old_slug_redirect_keeps_detail_page_accessible(self):
        article = self.create_published_article(
            title="旧链接文章",
            slug="old-slug-article",
            body="<p>正文内容。</p>",
        )
        old_slug = article.slug

        article.slug = "new-slug-article"
        article.save()

        response = self.client.get(reverse("simple_cms:article_detail", kwargs={"slug": old_slug}))
        follow_response = self.client.get(
            reverse("simple_cms:article_detail", kwargs={"slug": old_slug}),
            follow=True,
        )

        self.assertEqual(response.status_code, 301)
        self.assertEqual(
            response.headers["Location"],
            reverse("simple_cms:article_detail", kwargs={"slug": "new-slug-article"}),
        )
        self.assertEqual(follow_response.status_code, 200)
        self.assertContains(follow_response, "旧链接文章")


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
