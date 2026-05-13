from django.db import models


class FaqItem(models.Model):
    article = models.ForeignKey("simple_cms.Article", on_delete=models.CASCADE, related_name="faq_items")
    question = models.CharField("问题", max_length=255)
    answer = models.TextField("答案")
    sort_order = models.PositiveIntegerField("排序权重", default=0)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        app_label = "simple_cms"
        verbose_name = "FAQ 条目"
        verbose_name_plural = "FAQ 条目"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.question
