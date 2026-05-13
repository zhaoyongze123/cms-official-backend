from django.db import models


class AiReviewRun(models.Model):
    STATUS_CHOICES = (
        ("pending", "待处理"),
        ("running", "运行中"),
        ("completed", "已完成"),
        ("failed", "失败"),
        ("cancelled", "已取消"),
    )

    run_id = models.CharField("Run ID", max_length=64, unique=True)
    schema_version = models.CharField("Schema 版本", max_length=10, default="v1")
    article = models.ForeignKey(
        "simple_cms.Article",
        on_delete=models.CASCADE,
        related_name="ai_review_runs",
        verbose_name="文章",
    )
    status = models.CharField("状态", max_length=20, choices=STATUS_CHOICES)
    provider = models.CharField("提供方", max_length=100)
    model = models.CharField("模型", max_length=100)
    prompt_version = models.CharField("Prompt 版本", max_length=50)
    trace_id = models.CharField("Trace ID", max_length=128, blank=True)
    token_usage = models.JSONField("Token 用量", default=dict)
    error = models.JSONField("错误信息", null=True, blank=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    completed_at = models.DateTimeField("完成时间", null=True, blank=True)

    class Meta:
        app_label = "simple_cms"
        verbose_name = "AI 审核运行"
        verbose_name_plural = "AI 审核运行"
        ordering = ["-created_at"]

    def __str__(self):
        return self.run_id
