from django.db import models


class KnowledgeSource(models.Model):
    SOURCE_TYPE_CHOICES = (
        ("article", "文章"),
        ("faq", "FAQ"),
        ("category", "分类页"),
        ("tag", "标签页"),
        ("product", "产品页"),
        ("service", "服务页"),
        ("brand", "品牌页"),
        ("case", "案例页"),
        ("term", "术语库"),
        ("seo_rule", "SEO 规则"),
    )

    source_type = models.CharField("来源类型", max_length=32, choices=SOURCE_TYPE_CHOICES)
    source_id = models.PositiveBigIntegerField("来源 ID")
    title = models.CharField("来源标题", max_length=255)
    url = models.CharField("来源 URL", max_length=500)
    content_hash = models.CharField("内容哈希", max_length=71)
    is_active = models.BooleanField("是否启用", default=True)
    last_indexed_at = models.DateTimeField("最近索引时间", null=True, blank=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        app_label = "simple_cms"
        verbose_name = "知识来源"
        verbose_name_plural = "知识来源"
        ordering = ["source_type", "source_id"]
        constraints = [
            models.UniqueConstraint(fields=["source_type", "source_id"], name="uniq_knowledge_source_type_id"),
        ]

    def __str__(self):
        return f"{self.source_type}:{self.source_id}:{self.title}"
