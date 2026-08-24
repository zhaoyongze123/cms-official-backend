from django.db import models, transaction


class ManagedPage(models.Model):
    STATUS_CHOICES = (
        ("draft", "草稿"),
        ("published", "已发布"),
    )
    TEMPLATE_CHOICES = (
        ("default", "标准页面"),
        ("rich-text", "富文本页面"),
    )

    path = models.CharField("页面 URL", max_length=255, unique=True)
    title = models.CharField("页面标题", max_length=255)
    template_key = models.CharField("前端模板", max_length=80, choices=TEMPLATE_CHOICES, default="default")
    status = models.CharField("状态", max_length=20, choices=STATUS_CHOICES, default="draft")
    content_json = models.JSONField("页面内容 JSON", default=dict, blank=True)
    content_html = models.TextField("页面内容 HTML", blank=True)
    meta_description = models.TextField("SEO 描述", blank=True)
    canonical_url = models.URLField("Canonical URL", blank=True)
    robots = models.CharField("Robots", max_length=80, default="index,follow")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "simple_cms"
        ordering = ["path"]
        verbose_name = "页面内容"
        verbose_name_plural = "页面内容"

    def save(self, *args, **kwargs):
        self.path = self.path.strip()
        if not self.path.startswith("/"):
            self.path = f"/{self.path}"
        self.path = self.path.rstrip("/") or "/"
        old_page = ManagedPage.objects.filter(pk=self.pk).first() if self.pk else None
        super().save(*args, **kwargs)
        if old_page is None or any(
            getattr(old_page, field) != getattr(self, field)
            for field in ("path", "title", "template_key", "status", "content_json", "content_html", "meta_description", "canonical_url", "robots")
        ):
            from cms_apps.common.services.public_cache import invalidate_public_web_cache

            transaction.on_commit(invalidate_public_web_cache)

    def __str__(self):
        return f"{self.title} ({self.path})"
