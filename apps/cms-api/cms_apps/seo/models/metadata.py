from django.db import models

from apps.media_library.models import ImageItem


class SeoMetadata(models.Model):
    article = models.OneToOneField("simple_cms.Article", on_delete=models.CASCADE, related_name="seo_metadata")
    meta_title = models.CharField("Meta Title", max_length=255, blank=True)
    meta_description = models.TextField("Meta Description", blank=True)
    meta_keywords = models.CharField("Meta Keywords", max_length=500, blank=True)
    canonical_url = models.URLField("Canonical URL", blank=True)
    robots = models.CharField("Robots", max_length=50, default="index,follow")
    og_title = models.CharField("OG 标题", max_length=255, blank=True)
    og_description = models.TextField("OG 描述", blank=True)
    og_image = models.ForeignKey(
        ImageItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="seo_og_articles",
        verbose_name="OG 图片",
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        app_label = "simple_cms"
        verbose_name = "SEO 元数据"
        verbose_name_plural = "SEO 元数据"

    def __str__(self):
        return f"SEO: {self.article.title}"
