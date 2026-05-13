from django.db import models


class AiPatch(models.Model):
    OPERATION_CHOICES = (
        ("insert_after", "插入到后面"),
        ("delete", "删除"),
        ("replace_text", "替换文本"),
        ("alt_text", "替换图片 Alt"),
    )

    patch_id = models.CharField("Patch ID", max_length=64, unique=True)
    patch_schema_version = models.CharField("Patch Schema 版本", max_length=10, default="v1")
    suggestion = models.ForeignKey(
        "simple_cms.AiSuggestion",
        on_delete=models.CASCADE,
        related_name="patches",
        verbose_name="建议",
    )
    operation = models.CharField("操作", max_length=20, choices=OPERATION_CHOICES)
    target_block_id = models.CharField("目标 Block ID", max_length=100)
    old_text = models.TextField("旧文本", blank=True, null=True)
    new_text = models.TextField("新文本", blank=True, null=True)
    new_block = models.JSONField("新块内容", blank=True, null=True)
    position = models.IntegerField("位置", null=True, blank=True)
    content_hash = models.CharField("内容哈希", max_length=255)
    reason = models.TextField("原因", blank=True, null=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)

    class Meta:
        app_label = "simple_cms"
        verbose_name = "AI Patch"
        verbose_name_plural = "AI Patch"
        indexes = [
            models.Index(fields=["suggestion", "operation"], name="sc_ai_sug_op_idx"),
        ]

    def __str__(self):
        return self.patch_id
