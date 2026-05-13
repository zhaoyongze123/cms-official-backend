from django.db import models

from .base import ARTICLE_STATUS_CHOICES


class ArticleSlugHistory(models.Model):
    article = models.ForeignKey("Article", on_delete=models.CASCADE, related_name="slug_histories")
    slug = models.SlugField("历史SEO URL", max_length=255, unique=True, allow_unicode=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="记录时间")

    class Meta:
        app_label = "simple_cms"
        verbose_name = "文章历史链接"
        verbose_name_plural = "文章历史链接"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.slug} -> {self.article.slug}"


class ArticleRevision(models.Model):
    article = models.ForeignKey("Article", on_delete=models.CASCADE, related_name="revisions")
    title_snapshot = models.CharField("标题快照", max_length=255)
    slug_snapshot = models.SlugField("SEO URL快照", max_length=255, allow_unicode=True)
    body_snapshot = models.TextField("正文快照")
    status_snapshot = models.CharField("状态快照", max_length=20, choices=ARTICLE_STATUS_CHOICES)
    publish_date_snapshot = models.DateTimeField("发布时间快照", null=True, blank=True)
    meta_description_snapshot = models.TextField("SEO描述快照", blank=True)
    category_name_snapshot = models.CharField("分类快照", max_length=100, blank=True)
    changed_fields = models.CharField("变更字段", max_length=255)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="保存时间")

    class Meta:
        app_label = "simple_cms"
        verbose_name = "文章版本"
        verbose_name_plural = "文章版本"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.article.title} @ {self.created_at:%Y-%m-%d %H:%M}"
