from django.test import TestCase

from cms_apps.articles.models import Article, Category


class PublishingApiTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name="SEO",
            slug="seo",
            seo_title="SEO",
            seo_keywords="seo",
            seo_description="SEO 分类",
            sort_order=1,
        )

    def _create_article(
        self,
        *,
        title="用于发布测试的文章标题",
        slug="publish-test-article",
        meta_description="这是一段足够长的摘要内容，用于通过发布前 SEO 检查的最小长度要求。",
        content_json=None,
        content_html="<p>正文内容</p>",
        status="draft",
    ):
        if content_json is None:
            content_json = {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "attrs": {"blockId": "blk_intro"},
                        "content": [{"type": "text", "text": "正文内容"}],
                    }
                ],
            }

        return Article.objects.create(
            category=self.category,
            title=title,
            slug=slug,
            body=content_html,
            content_json=content_json,
            content_html=content_html,
            status=status,
            meta_description=meta_description,
        )

    def test_seo_check_returns_404_for_missing_article(self):
        response = self.client.post("/api/articles/999999/seo-check/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "not_found")

    def test_seo_check_returns_error_warning_passed_buckets(self):
        article = self._create_article(
            title="短标题",
            meta_description="过短摘要",
            content_json={},
            content_html="",
            slug="seo-check-buckets",
        )

        response = self.client.post(f"/api/articles/{article.id}/seo-check/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("errors", payload)
        self.assertIn("warnings", payload)
        self.assertIn("passed", payload)
        self.assertTrue(any(item["code"] == "title_missing_or_short" for item in payload["errors"]))
        self.assertTrue(any(item["code"] == "content_missing" for item in payload["errors"]))
        self.assertTrue(any(item["code"] == "summary_too_short" for item in payload["warnings"]))
        self.assertTrue(any(item["code"] == "slug_present" for item in payload["passed"]))

    def test_publish_blocks_when_seo_errors_exist(self):
        article = self._create_article(
            title="短标题",
            meta_description="过短摘要",
            content_json={},
            content_html="",
            slug="publish-blocked",
        )

        response = self.client.post(f"/api/articles/{article.id}/publish/")

        self.assertEqual(response.status_code, 409)
        article.refresh_from_db()
        self.assertEqual(article.status, "draft")
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "publish_blocked_by_seo_error")

    def test_publish_allows_warning_only_and_updates_status(self):
        article = self._create_article(
            slug="publish-with-warning",
            meta_description="",
            content_html="<p>正文内容</p>",
            content_json={
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "attrs": {"blockId": "blk_intro"},
                        "content": [{"type": "text", "text": "正文内容"}],
                    }
                ],
            },
        )

        response = self.client.post(f"/api/articles/{article.id}/publish/")

        self.assertEqual(response.status_code, 200)
        article.refresh_from_db()
        self.assertEqual(article.status, "published")
        payload = response.json()
        self.assertEqual(payload["article"]["status"], "published")
        self.assertTrue(any(item["code"] == "summary_missing" for item in payload["seo_check"]["warnings"]))
        self.assertTrue(any(item["code"] == "title_present" for item in payload["seo_check"]["passed"]))
