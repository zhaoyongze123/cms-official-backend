from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from cms_apps.articles.models import Article, Category, Tag
from cms_apps.faq.models import FaqItem
from cms_apps.seo.models.metadata import SeoMetadata
from apps.media_library.models import ImageItem


class ArticleApiTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name="SEO",
            slug="seo",
            seo_title="SEO",
            seo_keywords="seo",
            seo_description="SEO 分类",
            sort_order=1,
        )
        self.tag = Tag.objects.create(name="结构化数据", slug="structured-data")
        self.article = Article.objects.create(
            category=self.category,
            title="文章 API 测试",
            slug="article-api-test",
            body="<p>legacy body</p>",
            content_json={
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "attrs": {"blockId": "blk_intro"},
                        "content": [{"type": "text", "text": "hello"}],
                    }
                ],
            },
            content_html="<p>hello</p>",
            status="draft",
        )
        self.article.tags.add(self.tag)
        self.article.status = "published"
        self.article.save()
        self.og_image = ImageItem.objects.create(
            title="OG 封面",
            alt_text="用于社交分享的封面图",
            file=SimpleUploadedFile("og-cover.png", b"fake-image-bytes", content_type="image/png"),
        )
        self.seo_metadata = SeoMetadata.objects.create(
            article=self.article,
            meta_title="公开 SEO 标题",
            meta_description="公开 SEO 描述",
            meta_keywords="seo,article",
            canonical_url="https://www.yuncan.com/articles/article-api-test/",
            robots="index,follow",
            og_title="公开 OG 标题",
            og_description="公开 OG 描述",
            og_image=self.og_image,
        )
        FaqItem.objects.create(
            article=self.article,
            question="什么是 SEO 文章？",
            answer="这是一个 FAQ 示例答案。",
            sort_order=1,
        )

        self.draft_article = Article.objects.create(
            category=self.category,
            title="草稿文章",
            slug="draft-article",
            body="<p>draft</p>",
            content_json={"type": "doc", "content": []},
            content_html="<p>draft</p>",
            status="draft",
        )

    def test_get_list_returns_serialized_articles(self):
        response = self.client.get("/api/articles/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsInstance(payload, list)
        self.assertGreaterEqual(len(payload), 1)

        article = next(item for item in payload if item["article_id"] == self.article.id)
        self.assertIn("status", article)
        self.assertIn("content_json", article)
        self.assertIn("content_html", article)
        self.assertIn("category", article)
        self.assertIn("tags", article)
        self.assertIn("seo", article)

        self.assertEqual(article["status"], "published")
        self.assertEqual(article["content_json"], self.article.content_json)
        self.assertEqual(article["content_html"], self.article.content_html)
        self.assertEqual(article["category"]["category_id"], self.category.id)
        self.assertEqual(article["category"]["name"], self.category.name)
        self.assertEqual(article["category"]["slug"], self.category.slug)
        self.assertEqual(article["tags"][0]["tag_id"], self.tag.id)
        self.assertEqual(article["tags"][0]["name"], self.tag.name)
        self.assertEqual(article["tags"][0]["slug"], self.tag.slug)
        self.assertEqual(article["seo"]["meta_title"], self.seo_metadata.meta_title)
        self.assertEqual(article["seo"]["meta_description"], self.seo_metadata.meta_description)
        self.assertEqual(article["seo"]["canonical_url"], self.seo_metadata.canonical_url)
        self.assertEqual(article["seo"]["robots"], self.seo_metadata.robots)
        self.assertEqual(article["seo"]["og_title"], self.seo_metadata.og_title)
        self.assertEqual(article["seo"]["og_description"], self.seo_metadata.og_description)
        self.assertEqual(article["seo"]["meta_keywords"], self.seo_metadata.meta_keywords)
        self.assertEqual(article["seo"]["og_image"]["image_id"], self.og_image.id)

    def test_post_create_returns_serialized_article(self):
        response = self.client.post(
            "/api/articles/",
            data={
                "title": "新建文章",
                "status": "draft",
                "category_id": self.category.id,
                "content_json": {"type": "doc", "content": []},
                "content_html": "<p>new</p>",
                "tag_ids": [self.tag.id],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertIn("article_id", payload)
        self.assertEqual(payload["title"], "新建文章")
        self.assertEqual(payload["status"], "draft")
        self.assertEqual(payload["content_json"], {"type": "doc", "content": []})
        self.assertEqual(payload["content_html"], "<p>new</p>")
        self.assertEqual(payload["category"]["category_id"], self.category.id)
        self.assertEqual(payload["tags"][0]["tag_id"], self.tag.id)

    def test_get_detail_returns_serialized_article(self):
        response = self.client.get(f"/api/articles/{self.article.id}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["article_id"], self.article.id)
        self.assertEqual(payload["status"], "published")
        self.assertEqual(payload["content_json"], self.article.content_json)
        self.assertEqual(payload["content_html"], self.article.content_html)
        self.assertEqual(payload["category"]["category_id"], self.category.id)
        self.assertEqual(payload["tags"][0]["tag_id"], self.tag.id)

    def test_patch_update_returns_updated_fields(self):
        response = self.client.patch(
            f"/api/articles/{self.article.id}/",
            data={
                "status": "published",
                "content_json": {"type": "doc", "content": []},
                "content_html": "<p>updated</p>",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["article_id"], self.article.id)
        self.assertEqual(payload["status"], "published")
        self.assertEqual(payload["content_json"], {"type": "doc", "content": []})
        self.assertEqual(payload["content_html"], "<p>updated</p>")

    def test_patch_update_preserves_image_dimensions_in_content_json_and_html(self):
        image_payload = {
            "type": "doc",
            "content": [
                {
                    "type": "image",
                    "attrs": {
                        "src": "https://cdn.example.com/demo.png",
                        "alt": "示例图片",
                        "width": 420,
                        "height": 280,
                    },
                }
            ],
        }
        image_html = (
            '<figure><img src="https://cdn.example.com/demo.png" alt="示例图片" '
            'width="420" height="280" style="width:420px;height:280px;max-width:100%;" /></figure>'
        )

        response = self.client.patch(
            f"/api/articles/{self.article.id}/",
            data={
                "content_json": image_payload,
                "content_html": image_html,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["content_json"], image_payload)
        self.assertEqual(payload["content_html"], image_html)

    def test_patch_update_with_tag_names_reuses_and_creates_tags(self):
        response = self.client.patch(
            f"/api/articles/{self.article.id}/",
            data={
                "tag_names": ["结构化数据", "新标签", "结构化数据"],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual([tag["name"] for tag in payload["tags"]], ["结构化数据", "新标签"])
        self.assertTrue(Tag.objects.filter(name="新标签").exists())

    def test_patch_update_with_category_name_reuses_existing_category(self):
        response = self.client.patch(
            f"/api/articles/{self.article.id}/",
            data={
                "category_name": "SEO",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["category"]["category_id"], self.category.id)
        self.assertEqual(Category.objects.filter(name="SEO").count(), 1)

    def test_patch_update_with_category_name_creates_category(self):
        response = self.client.patch(
            f"/api/articles/{self.article.id}/",
            data={
                "category_name": "云迁移方案",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["category"]["name"], "云迁移方案")
        self.assertTrue(Category.objects.filter(name="云迁移方案").exists())

    def test_patch_update_supports_seo_and_faq_fields(self):
        alternate_image = ImageItem.objects.create(
            title="替换 OG 图",
            alt_text="新的分享封面图",
            file=SimpleUploadedFile("og-replace.png", b"replace-image-bytes", content_type="image/png"),
        )

        response = self.client.patch(
            f"/api/articles/{self.article.id}/",
            data={
                "meta_title": "更新后的 SEO 标题",
                "meta_keywords": "seo,cms,faq",
                "canonical_url": "https://www.yuncan.com/articles/updated-canonical/",
                "robots": "noindex,follow",
                "og_title": "更新后的 OG 标题",
                "og_description": "更新后的 OG 描述",
                "og_image_id": alternate_image.id,
                "faq_items": [
                    {
                        "question": "FAQ 一是什么？",
                        "answer": "FAQ 一的答案。",
                        "sort_order": 1,
                    },
                    {
                        "question": "FAQ 二是什么？",
                        "answer": "FAQ 二的答案。",
                        "sort_order": 2,
                    },
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["seo"]["meta_title"], "更新后的 SEO 标题")
        self.assertEqual(payload["seo"]["meta_keywords"], "seo,cms,faq")
        self.assertEqual(payload["seo"]["canonical_url"], "https://www.yuncan.com/articles/updated-canonical/")
        self.assertEqual(payload["seo"]["robots"], "noindex,follow")
        self.assertEqual(payload["seo"]["og_title"], "更新后的 OG 标题")
        self.assertEqual(payload["seo"]["og_description"], "更新后的 OG 描述")
        self.assertEqual(payload["seo"]["og_image"]["image_id"], alternate_image.id)
        self.assertEqual(len(payload["faq_items"]), 2)
        self.assertEqual(payload["faq_items"][0]["question"], "FAQ 一是什么？")

        self.article.refresh_from_db()
        self.seo_metadata.refresh_from_db()
        self.assertEqual(self.seo_metadata.meta_title, "更新后的 SEO 标题")
        self.assertEqual(self.seo_metadata.meta_keywords, "seo,cms,faq")
        self.assertEqual(self.seo_metadata.og_image_id, alternate_image.id)
        self.assertEqual(self.article.faq_items.count(), 2)

    def test_category_suggestion_list_supports_query(self):
        Category.objects.create(name="云安全", slug="cloud-security")

        response = self.client.get("/api/categories/?q=云")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual([item["name"] for item in payload], ["云安全"])

    def test_missing_article_returns_404(self):
        response = self.client.get("/api/articles/999999/")

        self.assertEqual(response.status_code, 404)

    def test_public_list_only_returns_published_articles(self):
        response = self.client.get("/api/public/articles/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["article_id"], self.article.id)
        self.assertEqual(payload[0]["status"], "published")

    def test_public_detail_by_slug_returns_published_article(self):
        response = self.client.get(f"/api/public/articles/{self.article.slug}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["article_id"], self.article.id)
        self.assertEqual(payload["slug"], self.article.slug)
        self.assertEqual(payload["status"], "published")
        self.assertEqual(payload["seo"]["meta_title"], self.seo_metadata.meta_title)
        self.assertEqual(payload["seo"]["canonical_url"], self.seo_metadata.canonical_url)
        self.assertEqual(
            payload["seo_payload"]["canonical_url_resolved"],
            self.seo_metadata.canonical_url,
        )
        self.assertEqual(payload["seo_payload"]["faq_items"][0]["question"], "什么是 SEO 文章？")
        self.assertEqual(payload["seo_payload"]["json_ld"]["breadcrumb"]["@type"], "BreadcrumbList")
        self.assertEqual(payload["seo_payload"]["json_ld"]["faq"]["@type"], "FAQPage")

    def test_public_detail_by_slug_hides_draft_article(self):
        response = self.client.get(f"/api/public/articles/{self.draft_article.slug}/")

        self.assertEqual(response.status_code, 404)
