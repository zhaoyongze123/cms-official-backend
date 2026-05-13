from django.db import models
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify
from ckeditor_uploader.fields import RichTextUploadingField
from pgvector.django import VectorField
from apps.media_library.models import ImageItem

from .base import ARTICLE_STATUS_CHOICES, ArticleQuerySet
from .category import Category
from .history import ArticleRevision, ArticleSlugHistory
from .tag import Tag


class Article(models.Model):
    STATUS_CHOICES = ARTICLE_STATUS_CHOICES

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="所属分类",
    )
    title = models.CharField("标题", max_length=255)
    slug = models.SlugField(
        "SEO URL",
        max_length=255,
        unique=True,
        blank=True,
        null=False,
        allow_unicode=True,
        help_text="Leave blank to auto-generate from title.",
    )
    cover_image = models.ForeignKey(
        ImageItem,
        verbose_name="封面大图",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="article_cover",
    )
    tags = models.ManyToManyField("Tag", verbose_name="标签", blank=True, related_name="articles")
    body = RichTextUploadingField(verbose_name="正文内容")
    content_json = models.JSONField(
        "TipTap 内容 JSON",
        default=dict,
        blank=True,
        help_text="编辑真相源，遵循 TipTap v1 契约。",
    )
    content_html = models.TextField(
        "正文 HTML 缓存",
        blank=True,
        help_text="供新版编辑器和 SEO 渲染复用的 HTML 缓存。",
    )

    is_pinned = models.BooleanField("置顶", default=False)
    pinned_at = models.DateTimeField("置顶时间", null=True, blank=True)
    sort_order = models.PositiveIntegerField("排序权重", default=0)

    status = models.CharField("状态", max_length=20, choices=STATUS_CHOICES, default="draft")
    publish_date = models.DateTimeField(
        "定时发布时间",
        null=True,
        blank=True,
        help_text="若设置未来的时间，将在此时间后才对外展示",
    )

    meta_description = models.TextField(
        "独立 SEO Description",
        blank=True,
        help_text="用于搜索引擎抓取，若不填则默认截取正文",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    objects = ArticleQuerySet.as_manager()

    class Meta:
        app_label = "simple_cms"
        verbose_name = "文章"
        verbose_name_plural = "文章"
        ordering = ["-created_at"]

    def _build_unique_slug(self, raw_slug):
        base = slugify(raw_slug, allow_unicode=True) or "article"
        candidate = base
        suffix = 1
        while (
            Article.objects.filter(slug=candidate).exclude(pk=self.pk).exists()
            or ArticleSlugHistory.objects.filter(slug=candidate).exclude(article_id=self.pk).exists()
        ):
            candidate = f"{base}-{suffix}"
            suffix += 1
        return candidate

    def save(self, *args, **kwargs):
        old_article = None
        if self.pk:
            old_article = Article.objects.filter(pk=self.pk).first()

        if self.slug:
            self.slug = self._build_unique_slug(self.slug)
        elif self.title:
            self.slug = self._build_unique_slug(self.title)

        if self.status == "published" and self.publish_date is None:
            self.publish_date = timezone.now()

        if self.is_pinned and self.pinned_at is None:
            self.pinned_at = timezone.now()
        if not self.is_pinned:
            self.pinned_at = None

        super().save(*args, **kwargs)

        if old_article and old_article.slug != self.slug and old_article.slug:
            ArticleSlugHistory.objects.get_or_create(article=self, slug=old_article.slug)

        changed_fields = []
        if not old_article:
            changed_fields = ["initial"]
        else:
            tracked = (
                "title",
                "slug",
                "category_id",
                "cover_image_id",
                "body",
                "content_json",
                "content_html",
                "is_pinned",
                "pinned_at",
                "sort_order",
                "status",
                "publish_date",
                "meta_description",
            )
            for field_name in tracked:
                if getattr(old_article, field_name) != getattr(self, field_name):
                    changed_fields.append(field_name)

        if changed_fields:
            ArticleRevision.objects.create(
                article=self,
                title_snapshot=self.title,
                slug_snapshot=self.slug,
                body_snapshot=self.body,
                status_snapshot=self.status,
                publish_date_snapshot=self.publish_date,
                meta_description_snapshot=self.meta_description,
                category_name_snapshot=self.category.name if self.category else "",
                changed_fields=", ".join(changed_fields),
            )

    def get_absolute_url(self):
        return reverse("simple_cms:article_detail", kwargs={"slug": self.slug})

    def __str__(self):
        return self.title
