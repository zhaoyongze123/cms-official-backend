from django.apps import apps
from django.core.exceptions import FieldDoesNotExist
from django.db import models
from django.test import TestCase


class AiReviewModelContractTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Article = cls._require_model("simple_cms", "Article")
        cls.AiReviewRun = cls._require_model("simple_cms", "AiReviewRun")
        cls.AiSuggestion = cls._require_model("simple_cms", "AiSuggestion")
        cls.AiPatch = cls._require_model("simple_cms", "AiPatch")

    @staticmethod
    def _require_model(app_label, model_name):
        try:
            return apps.get_model(app_label, model_name)
        except LookupError as exc:
            raise AssertionError(
                f"缺少模型 {app_label}.{model_name}，当前测试文件只做 ORM 契约校验，"
                "请在模型落地后保留这些断言并补齐字段名。"
            ) from exc

    @staticmethod
    def _get_field(model, *candidate_names):
        for name in candidate_names:
            try:
                return model._meta.get_field(name)
            except FieldDoesNotExist:
                continue
        raise AssertionError(
            f"{model.__name__} 缺少预期字段，候选字段为：{', '.join(candidate_names)}。"
        )

    @staticmethod
    def _get_relation_field_name(model, related_model):
        for field in model._meta.get_fields():
            if not getattr(field, "is_relation", False):
                continue
            remote_model = getattr(getattr(field, "remote_field", None), "model", None)
            if remote_model == related_model:
                return field.name
        raise AssertionError(
            f"{model.__name__} 没有指向 {related_model.__name__} 的关联字段，"
            "请在模型落地后核对 Article / Suggestion 外键命名。"
        )

    def _create_article(self):
        return self.Article.objects.create(
            title="AI 审核测试文章",
            body="<p>这是用于 ai_reviews ORM 契约测试的正文。</p>",
            meta_description="用于验证 AI 审核模型契约。",
            status="draft",
        )

    def _create_run(self, article):
        article_field_name = self._get_relation_field_name(self.AiReviewRun, self.Article)
        return self.AiReviewRun.objects.create(
            run_id="run_test_base",
            schema_version="v1",
            **{article_field_name: article},
            status="pending",
            provider="mock",
            model="mock-model",
            prompt_version="prompt-v1",
            trace_id="trace_test_base",
            token_usage={"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        )

    def test_ai_review_run_contract_covers_status_enum_and_json_fields(self):
        article = self._create_article()
        article_field_name = self._get_relation_field_name(self.AiReviewRun, self.Article)

        status_field = self._get_field(self.AiReviewRun, "status")
        self.assertEqual(
            [choice[0] for choice in status_field.choices],
            ["pending", "running", "completed", "failed", "cancelled"],
        )

        token_usage_field = self._get_field(self.AiReviewRun, "token_usage")
        error_field = self._get_field(self.AiReviewRun, "error")
        self.assertEqual(token_usage_field.get_internal_type(), "JSONField")
        self.assertEqual(error_field.get_internal_type(), "JSONField")

        run = self.AiReviewRun.objects.create(
            run_id="run_001",
            schema_version="v1",
            **{article_field_name: article},
            status="pending",
            provider="mock",
            model="mock-model",
            prompt_version="prompt-v1",
            trace_id="trace_001",
            token_usage={"prompt_tokens": 12, "completion_tokens": 34, "total_tokens": 46},
            error={"code": "mock_error", "message": "模拟错误", "details": {"stage": "review"}},
        )

        run.refresh_from_db()
        self.assertEqual(getattr(run, f"{article_field_name}_id"), article.id)
        self.assertEqual(
            run.token_usage,
            {"prompt_tokens": 12, "completion_tokens": 34, "total_tokens": 46},
        )
        self.assertEqual(
            run.error,
            {"code": "mock_error", "message": "模拟错误", "details": {"stage": "review"}},
        )

    def test_ai_suggestion_contract_covers_article_relation_and_source_chunks_round_trip(self):
        article = self._create_article()
        run = self._create_run(article)
        article_field_name = self._get_relation_field_name(self.AiSuggestion, self.Article)
        run_field_name = self._get_relation_field_name(self.AiSuggestion, self.AiReviewRun)

        suggestion_type_field = self._get_field(self.AiSuggestion, "type")
        suggestion_status_field = self._get_field(self.AiSuggestion, "status")
        severity_field = self._get_field(self.AiSuggestion, "severity")
        payload_field = self._get_field(self.AiSuggestion, "payload")
        source_chunks_field = self._get_field(self.AiSuggestion, "source_chunks")

        self.assertEqual(
            [choice[0] for choice in suggestion_status_field.choices],
            ["pending", "accepted", "rejected", "edited", "expired", "failed"],
        )
        self.assertEqual(
            [choice[0] for choice in severity_field.choices],
            ["low", "medium", "high"],
        )
        self.assertEqual(payload_field.get_internal_type(), "JSONField")
        self.assertEqual(source_chunks_field.get_internal_type(), "JSONField")

        suggestion = self.AiSuggestion.objects.create(
            suggestion_id="sug_001",
            schema_version="v1",
            **{article_field_name: article},
            **{run_field_name: run},
            type="body_replace",
            status="pending",
            severity="medium",
            title="优化表述",
            reason="原句过于笼统，需要更明确的业务表达。",
            payload={
                "review_scope": "body",
                "source": "mock",
                "meta": {"provider": "mock", "model": "mock-model"},
            },
            source_chunks=[
                {
                    "chunk_id": "chk_001",
                    "source_type": "article",
                    "source_id": article.id,
                    "title": article.title,
                    "url": "/articles/ai-review-test/",
                    "score": 0.98,
                }
            ],
        )

        suggestion.refresh_from_db()
        self.assertEqual(getattr(suggestion, f"{article_field_name}_id"), article.id)
        self.assertEqual(
            suggestion.payload,
            {
                "review_scope": "body",
                "source": "mock",
                "meta": {"provider": "mock", "model": "mock-model"},
            },
        )
        self.assertEqual(
            suggestion.source_chunks,
            [
                {
                    "chunk_id": "chk_001",
                    "source_type": "article",
                    "source_id": article.id,
                    "title": article.title,
                    "url": "/articles/ai-review-test/",
                    "score": 0.98,
                }
            ],
        )
        self.assertEqual(suggestion.type, "body_replace")

    def test_ai_patch_contract_binds_to_suggestion_and_preserves_patch_payload(self):
        article = self._create_article()
        run = self._create_run(article)
        suggestion_article_field_name = self._get_relation_field_name(self.AiSuggestion, self.Article)
        suggestion_run_field_name = self._get_relation_field_name(self.AiSuggestion, self.AiReviewRun)
        patch_suggestion_field_name = self._get_relation_field_name(self.AiPatch, self.AiSuggestion)

        suggestion = self.AiSuggestion.objects.create(
            suggestion_id="sug_002",
            schema_version="v1",
            **{suggestion_article_field_name: article},
            **{suggestion_run_field_name: run},
            type="body_replace",
            status="pending",
            severity="high",
            title="补充结论",
            reason="需要把核心结论写得更直接。",
            payload={"scenario": "patch"},
            source_chunks=[],
        )

        patch = self.AiPatch.objects.create(
            patch_id="patch_001",
            patch_schema_version="v1",
            **{patch_suggestion_field_name: suggestion},
            operation="replace_text",
            target_block_id="blk_intro",
            old_text="SEO很重要",
            new_text="SEO 是提升搜索曝光、点击率和转化的重要基础能力。",
            content_hash="sha256:deadbeef",
            reason="原句信息密度不足。",
        )

        patch.refresh_from_db()
        suggestion.refresh_from_db()

        self.assertEqual(getattr(patch, f"{patch_suggestion_field_name}_id"), suggestion.id)
        self.assertEqual(patch.operation, "replace_text")
        self.assertEqual(patch.target_block_id, "blk_intro")
        self.assertEqual(patch.content_hash, "sha256:deadbeef")
        self.assertEqual(patch.old_text, "SEO很重要")
        self.assertEqual(patch.new_text, "SEO 是提升搜索曝光、点击率和转化的重要基础能力。")

        reverse_accessor = self.AiPatch._meta.get_field(patch_suggestion_field_name).remote_field.get_accessor_name()
        self.assertEqual(getattr(suggestion, reverse_accessor).count(), 1)
        self.assertEqual(getattr(suggestion, reverse_accessor).first().patch_id, "patch_001")
