from django.db import models


class GoogleSearchConsoleSnapshot(models.Model):
    article = models.ForeignKey(
        "simple_cms.Article",
        on_delete=models.CASCADE,
        related_name="gsc_snapshots",
        verbose_name="文章",
    )
    snapshot_date = models.DateField("快照日期")
    page_url = models.URLField("页面 URL")
    clicks = models.PositiveIntegerField("点击量", default=0)
    impressions = models.PositiveIntegerField("曝光量", default=0)
    ctr = models.DecimalField("点击率", max_digits=8, decimal_places=4, default=0)
    average_position = models.DecimalField("平均排名", max_digits=8, decimal_places=2, default=0)
    source = models.CharField("来源", max_length=64, default="google_search_console")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        app_label = "cms_analytics"
        verbose_name = "GSC 页面快照"
        verbose_name_plural = "GSC 页面快照"
        ordering = ["-snapshot_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["article", "snapshot_date"],
                name="uniq_gsc_snapshot_article_date",
            )
        ]
