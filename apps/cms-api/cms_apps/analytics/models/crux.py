from django.db import models


class CruxPageSnapshot(models.Model):
    article = models.ForeignKey(
        "simple_cms.Article",
        on_delete=models.CASCADE,
        related_name="crux_snapshots",
        verbose_name="文章",
    )
    snapshot_date = models.DateField("快照日期")
    page_url = models.URLField("页面 URL")
    form_factor = models.CharField("设备形态", max_length=32, default="ALL")
    record_scope = models.CharField("记录粒度", max_length=16, default="url")
    lcp_ms = models.PositiveIntegerField("LCP 毫秒", null=True, blank=True)
    inp_ms = models.PositiveIntegerField("INP 毫秒", null=True, blank=True)
    cls_score = models.DecimalField("CLS 分数", max_digits=8, decimal_places=4, null=True, blank=True)
    source = models.CharField("来源", max_length=64, default="chrome_ux_report")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        app_label = "cms_analytics"
        verbose_name = "CrUX 页面快照"
        verbose_name_plural = "CrUX 页面快照"
        ordering = ["-snapshot_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["article", "snapshot_date"],
                name="uniq_crux_snapshot_article_date",
            )
        ]
