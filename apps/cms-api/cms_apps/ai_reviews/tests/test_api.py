from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase

from cms_apps.ai_reviews.models import AiPatch, AiReviewRun, AiSuggestion
from cms_apps.ai_reviews.services.tasks import AiTaskMessage, consume_review_task
from cms_apps.articles.models import Article, Category, Tag
from apps.sys_settings.models import SiteSetting


class AiReviewApiTests(TestCase):
    def setUp(self):
        SiteSetting.objects.get_or_create(id=1)
        self.category = Category.objects.create(
            name="SEO",
            slug="seo",
            seo_title="SEO",
            seo_keywords="seo",
            seo_description="SEO 分类",
            sort_order=1,
        )
        self.tag = Tag.objects.create(name="AI 审核", slug="ai-review")
        self.article = Article.objects.create(
            category=self.category,
            title="AI 审核测试文章",
            slug="ai-review-test",
            body="<p>正文</p>",
            content_json={"type": "doc", "content": []},
            content_html="<p>正文</p>",
            status="draft",
            meta_description="用于验证 AI 审核接口。",
        )
        self.article.tags.add(self.tag)

    def _create_suggestion_with_patch(
        self,
        *,
        suggestion_id="sug_accept_001",
        status="pending",
        patch_id="patch_accept_001",
        patch_schema_version="v1",
        operation="replace_text",
        target_block_id="blk_intro",
        content_hash="sha256:deadbeef",
    ):
        run = AiReviewRun.objects.create(
            run_id=f"run_{suggestion_id}",
            schema_version="v1",
            article=self.article,
            status="completed",
            provider="mock",
            model="mock-model",
            prompt_version="prompt-v1",
            trace_id=f"trace_{suggestion_id}",
            token_usage={"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        )
        suggestion = AiSuggestion.objects.create(
            suggestion_id=suggestion_id,
            schema_version="v1",
            run=run,
            article=self.article,
            type="body_replace",
            status=status,
            severity="medium",
            title="优化正文",
            reason="需要更明确表达。",
            payload={"source": "mock"},
            source_chunks=[{"chunk_id": "chk_001"}],
        )
        AiPatch.objects.create(
            patch_id=patch_id,
            patch_schema_version=patch_schema_version,
            suggestion=suggestion,
            operation=operation,
            target_block_id=target_block_id,
            old_text="旧文本",
            new_text="新文本",
            content_hash=content_hash,
            reason="测试 patch",
        )
        return suggestion

    def test_post_ai_review_enqueues_pending_run(self):
        with patch("cms_apps.ai_reviews.services.tasks._redis_client") as mocked_redis_client:
            mocked_redis_client.return_value.lpush.return_value = 1
            response = self.client.post(
                f"/api/articles/{self.article.id}/ai-review/",
                data={"force": True},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 202)
        payload = response.json()
        self.assertTrue(payload["run"]["run_id"].startswith("run_"))
        self.assertEqual(payload["run"]["status"], "pending")
        self.assertEqual(payload["suggestions"], [])
        self.assertTrue(AiReviewRun.objects.filter(run_id=payload["run"]["run_id"], article=self.article).exists())
        self.assertFalse(AiSuggestion.objects.filter(run__run_id=payload["run"]["run_id"]).exists())

    def test_get_ai_review_runs_returns_run_list(self):
        run = AiReviewRun.objects.create(
            run_id="run_002",
            schema_version="v1",
            article=self.article,
            status="completed",
            provider="mock",
            model="mock-model",
            prompt_version="prompt-v1",
            trace_id="trace_002",
            token_usage={"prompt_tokens": 1, "completion_tokens": 2, "total_tokens": 3},
        )
        AiSuggestion.objects.create(
            suggestion_id="sug_002",
            schema_version="v1",
            run=run,
            article=self.article,
            type="body_replace",
            status="pending",
            severity="high",
            title="补充结论",
            reason="需要更明确的结论。",
            payload={"source": "mock"},
            source_chunks=[],
        )

        response = self.client.get(f"/api/articles/{self.article.id}/ai-review-runs/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["run_id"], "run_002")
        self.assertEqual(payload[0]["article_id"], self.article.id)

    def test_get_suggestions_returns_run_suggestions(self):
        run = AiReviewRun.objects.create(
            run_id="run_003",
            schema_version="v1",
            article=self.article,
            status="completed",
            provider="mock",
            model="mock-model",
            prompt_version="prompt-v1",
            trace_id="trace_003",
            token_usage={"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        )
        suggestion = AiSuggestion.objects.create(
            suggestion_id="sug_003",
            schema_version="v1",
            run=run,
            article=self.article,
            type="body_replace",
            status="pending",
            severity="medium",
            title="补充摘要",
            reason="摘要过短。",
            payload={"source": "mock"},
            source_chunks=[{"chunk_id": "chk_003"}],
        )

        response = self.client.get(f"/api/ai-review-runs/{run.run_id}/suggestions/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["suggestion_id"], suggestion.suggestion_id)
        self.assertEqual(payload[0]["run_id"], run.run_id)

    def test_missing_article_returns_404(self):
        response = self.client.post(
            "/api/articles/999999/ai-review/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json(),
            {
                "error": {
                    "code": "not_found",
                    "message": "文章不存在",
                    "details": {},
                }
            },
        )

    def test_missing_run_returns_404(self):
        response = self.client.get("/api/ai-review-runs/not-exists/suggestions/")

        self.assertEqual(response.status_code, 404)

    def test_enqueue_failure_returns_error_structure(self):
        with patch(
            "cms_apps.ai_reviews.services.tasks._redis_client",
            side_effect=RuntimeError("Redis 不可用"),
        ):
            response = self.client.post(
                f"/api/articles/{self.article.id}/ai-review/",
                data={"force": True},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 502)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "ai_review_queue_error")
        self.assertEqual(payload["error"]["message"], "AI 审核任务入队失败")
        self.assertIn("Redis 不可用", payload["error"]["details"]["reason"])

    def test_worker_consume_review_task_persists_run_and_suggestions(self):
        run = AiReviewRun.objects.create(
            run_id="run_worker_001",
            schema_version="v1",
            article=self.article,
            status="pending",
            provider="siliconflow",
            model="mock-model",
            prompt_version="prompt-v1",
            trace_id="",
            token_usage={},
        )
        message = AiTaskMessage(
            task_type="review_article",
            run_id=run.run_id,
            article_id=self.article.id,
            payload={
                "article_id": self.article.id,
                "title": self.article.title,
                "slug": self.article.slug,
                "summary": self.article.meta_description,
                "content_html": self.article.content_html,
                "content_json": self.article.content_json,
                "status": self.article.status,
            },
        )
        mocked_result = {
            "run": {
                "run_id": run.run_id,
                "schema_version": "v1",
                "status": "completed",
                "provider": "siliconflow",
                "model": "mock-model",
                "prompt_version": "prompt-v1",
                "trace_id": "trace_worker_001",
                "token_usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
                "error": None,
            },
            "suggestions": [
                {
                    "suggestion_id": "sug_worker_001",
                    "schema_version": "v1",
                    "type": "body_replace",
                    "status": "pending",
                    "severity": "medium",
                    "title": "优化标题表达",
                    "reason": "标题信息密度不足。",
                    "payload": {"source": "mock"},
                    "source_chunks": [{"chunk_id": "chk_001"}],
                    "patches": [
                        {
                            "patch_id": "patch_worker_001",
                            "patch_schema_version": "v1",
                            "operation": "replace_text",
                            "target_block_id": "blk_intro",
                            "old_text": "旧文本",
                            "new_text": "新文本",
                            "content_hash": "sha256:deadbeef",
                            "reason": "测试 patch",
                        }
                    ],
                }
            ],
        }

        with patch("cms_apps.ai_reviews.services.tasks._http_post_json", return_value=mocked_result):
            consume_review_task(message)

        run.refresh_from_db()
        self.assertEqual(run.status, "completed")
        self.assertEqual(run.trace_id, "trace_worker_001")
        suggestion = AiSuggestion.objects.get(run=run)
        self.assertEqual(suggestion.suggestion_id, "sug_worker_001")
        self.assertEqual(suggestion.patches.first().patch_id, "patch_worker_001")

    def test_accept_suggestion_updates_status(self):
        suggestion = self._create_suggestion_with_patch()

        response = self.client.post(f"/api/ai-suggestions/{suggestion.suggestion_id}/accept/")

        self.assertEqual(response.status_code, 200)
        suggestion.refresh_from_db()
        self.assertEqual(suggestion.status, "accepted")
        payload = response.json()
        self.assertEqual(payload["suggestion_id"], suggestion.suggestion_id)
        self.assertEqual(payload["status"], "accepted")
        self.assertEqual(payload["patches"][0]["patch_id"], "patch_accept_001")

    def test_reject_suggestion_updates_status(self):
        suggestion = self._create_suggestion_with_patch(suggestion_id="sug_reject_001")

        response = self.client.post(f"/api/ai-suggestions/{suggestion.suggestion_id}/reject/")

        self.assertEqual(response.status_code, 200)
        suggestion.refresh_from_db()
        self.assertEqual(suggestion.status, "rejected")
        payload = response.json()
        self.assertEqual(payload["suggestion_id"], suggestion.suggestion_id)
        self.assertEqual(payload["status"], "rejected")

    def test_accept_missing_suggestion_returns_404(self):
        response = self.client.post("/api/ai-suggestions/not-exists/accept/")

        self.assertEqual(response.status_code, 404)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "not_found")
        self.assertEqual(payload["error"]["message"], "AI 建议不存在")

    def test_accept_non_pending_suggestion_returns_409(self):
        suggestion = self._create_suggestion_with_patch(
            suggestion_id="sug_conflict_001",
            status="accepted",
        )

        response = self.client.post(f"/api/ai-suggestions/{suggestion.suggestion_id}/accept/")

        self.assertEqual(response.status_code, 409)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "conflict")
        self.assertEqual(payload["error"]["message"], "建议当前状态不允许重复操作")

    def test_reject_non_pending_suggestion_returns_409(self):
        suggestion = self._create_suggestion_with_patch(
            suggestion_id="sug_conflict_002",
            status="rejected",
        )

        response = self.client.post(f"/api/ai-suggestions/{suggestion.suggestion_id}/reject/")

        self.assertEqual(response.status_code, 409)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "conflict")
        self.assertEqual(payload["error"]["message"], "建议当前状态不允许重复操作")

    def test_accept_invalid_patch_returns_400(self):
        suggestion = self._create_suggestion_with_patch(
            suggestion_id="sug_invalid_patch_001",
            target_block_id="invalid-block-id",
        )

        response = self.client.post(f"/api/ai-suggestions/{suggestion.suggestion_id}/accept/")

        self.assertEqual(response.status_code, 400)
        suggestion.refresh_from_db()
        self.assertEqual(suggestion.status, "pending")
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "validation_error")
        self.assertIn("patches[0]", payload["error"]["details"])

    def test_reject_invalid_patch_still_succeeds(self):
        suggestion = self._create_suggestion_with_patch(
            suggestion_id="sug_invalid_patch_002",
            target_block_id="invalid-block-id",
        )

        response = self.client.post(f"/api/ai-suggestions/{suggestion.suggestion_id}/reject/")

        self.assertEqual(response.status_code, 200)
        suggestion.refresh_from_db()
        self.assertEqual(suggestion.status, "rejected")

    def test_get_ai_generation_settings_returns_site_setting_snapshot(self):
        setting = SiteSetting.objects.get(id=1)
        setting.ai_review_model = "Qwen/Qwen2.5-32B-Instruct"
        setting.ai_generate_model = "deepseek-ai/DeepSeek-V3"
        setting.ai_alt_model = "Qwen/Qwen2.5-72B-Instruct"
        setting.siliconflow_api_key = "sk-test-1234567890"
        setting.ai_generate_model_options = ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"]
        setting.ai_review_prompt = "review prompt"
        setting.ai_metadata_prompt = "metadata prompt"
        setting.ai_faq_prompt = "faq prompt"
        setting.ai_internal_links_prompt = "internal links prompt"
        setting.ai_alt_prompt = "alt prompt"
        setting.ai_generate_title_prompt = "标题 prompt"
        setting.ai_generate_slug_prompt = "slug prompt"
        setting.ai_generate_tags_prompt = "tags prompt"
        setting.ai_generate_description_prompt = "description prompt"
        setting.save()

        response = self.client.get("/api/ai/settings/generation/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["models"]["review"], "Qwen/Qwen2.5-32B-Instruct")
        self.assertEqual(payload["models"]["generation"], "deepseek-ai/DeepSeek-V3")
        self.assertEqual(payload["models"]["alt"], "Qwen/Qwen2.5-72B-Instruct")
        self.assertEqual(payload["api_key"]["has_value"], True)
        self.assertEqual(payload["api_key"]["masked_value"], "sk-t***7890")
        self.assertEqual(payload["model_options"], ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"])
        self.assertEqual(payload["prompts"]["review_prompt"], "review prompt")
        self.assertEqual(payload["prompts"]["metadata_prompt"], "metadata prompt")
        self.assertEqual(payload["prompts"]["faq_prompt"], "faq prompt")
        self.assertEqual(payload["prompts"]["internal_links_prompt"], "internal links prompt")
        self.assertEqual(payload["prompts"]["alt_prompt"], "alt prompt")
        self.assertEqual(payload["prompts"]["title_prompt"], "标题 prompt")
        self.assertEqual(payload["prompts"]["slug_prompt"], "slug prompt")
        self.assertEqual(payload["prompts"]["tags_prompt"], "tags prompt")
        self.assertEqual(payload["prompts"]["description_prompt"], "description prompt")

    def test_patch_ai_generation_settings_updates_site_setting(self):
        response = self.client.patch(
            "/api/ai/settings/generation/",
            data={
                "api_key": {"value": "sk-updated-123456"},
                "models": {
                    "review": "deepseek-ai/DeepSeek-V3",
                    "generation": "Qwen/Qwen2.5-32B-Instruct",
                    "alt": "Qwen/Qwen2.5-72B-Instruct",
                },
                "model_options": ["Qwen/Qwen2.5-32B-Instruct", "deepseek-ai/DeepSeek-V3"],
                "prompts": {
                    "review_prompt": "新的 review prompt",
                    "metadata_prompt": "新的 metadata prompt",
                    "faq_prompt": "新的 faq prompt",
                    "internal_links_prompt": "新的 internal links prompt",
                    "alt_prompt": "新的 alt prompt",
                    "title_prompt": "新的标题 prompt",
                    "slug_prompt": "新的 slug prompt",
                    "tags_prompt": "新的 tags prompt",
                    "description_prompt": "新的 description prompt",
                },
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        setting = SiteSetting.objects.get(id=1)
        self.assertEqual(setting.siliconflow_api_key, "sk-updated-123456")
        self.assertEqual(setting.ai_review_model, "deepseek-ai/DeepSeek-V3")
        self.assertEqual(setting.ai_generate_model, "Qwen/Qwen2.5-32B-Instruct")
        self.assertEqual(setting.ai_alt_model, "Qwen/Qwen2.5-72B-Instruct")
        self.assertEqual(
            setting.ai_generate_model_options,
            ["Qwen/Qwen2.5-72B-Instruct", "Qwen/Qwen2.5-32B-Instruct", "deepseek-ai/DeepSeek-V3"],
        )
        self.assertEqual(setting.ai_review_prompt, "新的 review prompt")
        self.assertEqual(setting.ai_metadata_prompt, "新的 metadata prompt")
        self.assertEqual(setting.ai_faq_prompt, "新的 faq prompt")
        self.assertEqual(setting.ai_internal_links_prompt, "新的 internal links prompt")
        self.assertEqual(setting.ai_alt_prompt, "新的 alt prompt")
        self.assertEqual(setting.ai_generate_title_prompt, "新的标题 prompt")
        self.assertEqual(setting.ai_generate_slug_prompt, "新的 slug prompt")
        self.assertEqual(setting.ai_generate_tags_prompt, "新的 tags prompt")
        self.assertEqual(setting.ai_generate_description_prompt, "新的 description prompt")

    def test_patch_ai_generation_settings_keeps_existing_api_key_when_value_blank(self):
        setting = SiteSetting.objects.get(id=1)
        setting.siliconflow_api_key = "sk-existing-123456"
        setting.save(update_fields=["siliconflow_api_key"])

        response = self.client.patch(
            "/api/ai/settings/generation/",
            data={
                "api_key": {"value": ""},
                "models": {
                    "review": "deepseek-ai/DeepSeek-V3",
                    "generation": "Qwen/Qwen2.5-32B-Instruct",
                    "alt": "Qwen/Qwen2.5-72B-Instruct",
                },
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        setting.refresh_from_db()
        self.assertEqual(setting.siliconflow_api_key, "sk-existing-123456")

    def test_post_ai_generate_alt_returns_fastapi_payload(self):
        mocked_response = {
            "trace_id": "trace_alt_001",
            "provider": "mock",
            "model": "Qwen/Qwen2.5-32B-Instruct",
            "suggestion": {
                "suggestion_id": "sug_alt_001",
                "schema_version": "v1",
                "article_id": self.article.id,
                "type": "alt_text",
                "status": "pending",
                "severity": "low",
                "title": "生成图片 Alt",
                "reason": "图片缺少适合检索与可访问性的替代文本。",
                "payload": {},
                "patches": [
                    {
                        "patch_id": "patch_alt_001",
                        "patch_schema_version": "v1",
                        "operation": "alt_text",
                        "target_block_id": "blk_image_1",
                        "content_hash": "sha256:test",
                        "old_text": None,
                        "new_text": "网关拓扑图，展示零信任访问链路",
                        "new_block": None,
                        "position": None,
                        "reason": "为图片补充可读的替代文本。",
                    }
                ],
                "source_chunks": [],
                "created_at": "2026-05-12T00:00:00Z",
                "updated_at": "2026-05-12T00:00:00Z",
            },
        }

        with patch("cms_apps.ai_reviews.api.generation_views.generate_alt_with_fastapi", return_value=mocked_response) as mocked_generate:
            response = self.client.post(
                f"/api/articles/{self.article.id}/ai-generate-alt/",
                data={
                    "image_url": "https://example.com/zero-trust.png",
                    "image_title": "零信任拓扑图",
                    "target_block_id": "blk_image_1",
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["trace_id"], "trace_alt_001")
        self.assertEqual(payload["suggestion"]["patches"][0]["new_text"], "网关拓扑图，展示零信任访问链路")
        mocked_generate.assert_called_once()

    def test_generate_metadata_request_payload_includes_current_ai_generation_config(self):
        setting = SiteSetting.objects.get(id=1)
        setting.ai_review_model = "Qwen/Qwen2.5-72B-Instruct"
        setting.ai_generate_model = "deepseek-ai/DeepSeek-V3"
        setting.ai_alt_model = "Qwen/Qwen2.5-32B-Instruct"
        setting.ai_review_prompt = "review prompt A"
        setting.ai_metadata_prompt = "metadata prompt A"
        setting.ai_faq_prompt = "faq prompt A"
        setting.ai_internal_links_prompt = "internal links prompt A"
        setting.ai_alt_prompt = "alt prompt A"
        setting.ai_generate_title_prompt = "标题 prompt A"
        setting.ai_generate_slug_prompt = "slug prompt B"
        setting.ai_generate_tags_prompt = "tags prompt C"
        setting.ai_generate_description_prompt = "description prompt D"
        setting.save()

        from cms_apps.ai_reviews.services.tasks import build_generate_alt_request_payload, build_generate_metadata_request_payload

        payload = build_generate_metadata_request_payload(self.article, {"title": "手工标题"})

        self.assertEqual(payload["title"], "手工标题")
        self.assertEqual(payload["model"], "deepseek-ai/DeepSeek-V3")
        self.assertEqual(
            payload["prompts"],
            {
                "review_prompt": "review prompt A",
                "metadata_prompt": "metadata prompt A",
                "faq_prompt": "faq prompt A",
                "internal_links_prompt": "internal links prompt A",
                "alt_prompt": "alt prompt A",
                "title_prompt": "标题 prompt A",
                "slug_prompt": "slug prompt B",
                "tags_prompt": "tags prompt C",
                "description_prompt": "description prompt D",
            },
        )

        alt_payload = build_generate_alt_request_payload(self.article, {"title": "图片标题"})
        self.assertEqual(alt_payload["model"], "Qwen/Qwen2.5-32B-Instruct")
