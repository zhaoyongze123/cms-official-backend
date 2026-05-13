from django.db import models


class Ga4PageSnapshot(models.Model):
    article = models.ForeignKey(
        "simple_cms.Article",
        on_delete=models.CASCADE,
        related_name="ga4_snapshots",
        verbose_name="文章",
    )
    snapshot_date = models.DateField("快照日期")
    page_path = models.CharField("页面路径", max_length=255)
    sessions = models.PositiveIntegerField("会话数", default=0)
    users = models.PositiveIntegerField("用户数", default=0)
    bounce_rate = models.DecimalField("跳出率", max_digits=8, decimal_places=4, default=0)
    avg_engagement_seconds = models.PositiveIntegerField("平均参与秒数", default=0)
    conversions = models.DecimalField("转化数", max_digits=12, decimal_places=2, default=0)
    source = models.CharField("来源", max_length=64, default="ga4_data_api")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        app_label = "cms_analytics"
        verbose_name = "GA4 页面快照"
        verbose_name_plural = "GA4 页面快照"
        ordering = ["-snapshot_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["article", "snapshot_date"],
                name="uniq_ga4_snapshot_article_date",
            )
        ]
