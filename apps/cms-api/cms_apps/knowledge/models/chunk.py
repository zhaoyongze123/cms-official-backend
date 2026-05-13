from django.db import models
from pgvector.django import VectorField

from .source import KnowledgeSource


class KnowledgeChunk(models.Model):
    source = models.ForeignKey(KnowledgeSource, on_delete=models.CASCADE, related_name="chunks", verbose_name="知识来源")
    chunk_index = models.PositiveIntegerField("分块序号")
    chunk_text = models.TextField("分块文本")
    chunk_hash = models.CharField("分块哈希", max_length=71)
    embedding = VectorField("向量", dimensions=1536, null=True, blank=True)
    embedding_model = models.CharField("向量模型", max_length=255, blank=True)
    embedding_dimensions = models.PositiveIntegerField("向量维度", default=1536)
    metadata = models.JSONField("附加元数据", default=dict, blank=True)
    is_active = models.BooleanField("是否启用", default=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        app_label = "simple_cms"
        verbose_name = "知识分块"
        verbose_name_plural = "知识分块"
        ordering = ["source_id", "chunk_index"]
        constraints = [
            models.UniqueConstraint(fields=["source", "chunk_index"], name="uniq_knowledge_chunk_source_index"),
        ]
        indexes = [
            models.Index(fields=["is_active", "source"], name="simple_cms__knowledg_iact_idx"),
            models.Index(fields=["chunk_hash"], name="simple_cms__knowledg_hash_idx"),
        ]

    def __str__(self):
        return f"{self.source}#{self.chunk_index}"
