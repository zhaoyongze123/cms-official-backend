from django.core.management import call_command
from django.test import TestCase

from cms_apps.articles.models import Article, Category, Tag
from cms_apps.knowledge.models import KnowledgeChunk, KnowledgeSource
from cms_apps.knowledge.services.rag import (
    deterministic_embedding,
    rebuild_knowledge_index,
    search_knowledge,
    serialize_chunks,
)


class RagServiceMigrationTests(TestCase):
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

    def test_rebuild_knowledge_index_creates_source_and_chunks(self):
        results = rebuild_knowledge_index()
        self.assertEqual(len(results), 1)
        self.assertEqual(KnowledgeSource.objects.count(), 1)
        self.assertGreater(KnowledgeChunk.objects.count(), 0)

    def test_rag_query_serialization_uses_knowledge_models(self):
        rebuild_knowledge_index()
        chunks = search_knowledge("Schema", limit=2)
        payload = serialize_chunks(chunks)
        self.assertGreater(len(payload), 0)
        self.assertEqual(payload[0]["source_type"], "article")

