from django.db import models

class AiSuggestion(models.Model):
    TYPE_CHOICES = (
        ("metadata", "元数据"),
        ("faq", "FAQ"),
        ("internal_link", "内链"),
        ("semantic_keyword", "语义关键词"),
        ("body_insert", "正文插入"),
        ("body_delete", "正文删除"),
        ("body_replace", "正文替换"),
        ("alt_text", "图片 Alt"),
    )

    STATUS_CHOICES = (
        ("pending", "待处理"),
        ("accepted", "已接受"),
        ("rejected", "已拒绝"),
        ("edited", "已编辑"),
        ("expired", "已过期"),
        ("failed", "失败"),
    )

    SEVERITY_CHOICES = (
        ("low", "低"),
        ("medium", "中"),
        ("high", "高"),
    )

    suggestion_id = models.CharField("Suggestion ID", max_length=64, unique=True)
    schema_version = models.CharField("Schema 版本", max_length=10, default="v1")
    run = models.ForeignKey(
        "simple_cms.AiReviewRun",
        on_delete=models.CASCADE,
        related_name="suggestions",
        verbose_name="审核运行",
    )
    article = models.ForeignKey(
        "simple_cms.Article",
        on_delete=models.CASCADE,
        related_name="ai_suggestions",
        verbose_name="文章",
    )
    type = models.CharField("类型", max_length=50, choices=TYPE_CHOICES)
    status = models.CharField("状态", max_length=20, choices=STATUS_CHOICES)
    severity = models.CharField("严重程度", max_length=20, choices=SEVERITY_CHOICES)
    title = models.CharField("标题", max_length=255)
    reason = models.TextField("原因")
    payload = models.JSONField("载荷", default=dict)
    source_chunks = models.JSONField("来源分块", default=list)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        app_label = "simple_cms"
        verbose_name = "AI 建议"
        verbose_name_plural = "AI 建议"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["run", "status"], name="sc_ai_run_st_idx"),
            models.Index(fields=["article", "status"], name="sc_ai_art_st_idx"),
        ]

    def __str__(self):
        return self.suggestion_id
