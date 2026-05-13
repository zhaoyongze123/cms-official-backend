from django.db import models

from cms_apps.articles.models import Article


class AnalyticsSnapshot(models.Model):
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="analytics_snapshots",
        verbose_name="文章",
    )
    snapshot_date = models.DateField("快照日期")
    source = models.CharField("来源", max_length=32, default="manual")
    impressions = models.PositiveIntegerField("曝光量", default=0)
    clicks = models.PositiveIntegerField("点击量", default=0)
    average_position = models.DecimalField("平均排名", max_digits=6, decimal_places=2, default=0)
    ctr = models.DecimalField("点击率", max_digits=6, decimal_places=4, default=0)
    sessions = models.PositiveIntegerField("会话数", default=0)
    users = models.PositiveIntegerField("用户数", default=0)
    bounce_rate = models.DecimalField("跳出率", max_digits=6, decimal_places=4, default=0)
    avg_engagement_seconds = models.PositiveIntegerField("平均参与秒数", default=0)
    conversions = models.PositiveIntegerField("转化数", default=0)
    notes = models.TextField("备注", blank=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        app_label = "cms_analytics"
        verbose_name = "分析快照"
        verbose_name_plural = "分析快照"
        ordering = ["-snapshot_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["article", "snapshot_date", "source"],
                name="uniq_analytics_snapshot_article_date_source",
            )
        ]
        indexes = [
            models.Index(fields=["snapshot_date"], name="analytics_date_idx"),
            models.Index(fields=["article", "snapshot_date"], name="analytics_article_date_idx"),
        ]

    def __str__(self):
        return f"{self.article_id}-{self.snapshot_date}-{self.source}"
