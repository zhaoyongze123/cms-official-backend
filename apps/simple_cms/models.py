from django.db import models
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify
from ckeditor_uploader.fields import RichTextUploadingField
from pgvector.django import VectorField
from apps.media_library.models import ImageItem


class ArticleQuerySet(models.QuerySet):
    def published(self):
        now = timezone.now()
        return (
            self.filter(status="published")
            .filter(models.Q(publish_date__isnull=True) | models.Q(publish_date__lte=now))
            .order_by("-is_pinned", "-pinned_at", "-sort_order", "-publish_date", "-created_at")
        )


class Category(models.Model):
    name = models.CharField("分类名称", max_length=100)
    slug = models.SlugField("URL缩略名", unique=True)
    seo_title = models.CharField("SEO 标题", max_length=255, blank=True)
    seo_keywords = models.CharField("SEO 关键词", max_length=255, blank=True)
    seo_description = models.TextField("SEO 描述", blank=True)
    sort_order = models.PositiveIntegerField("排序权重", default=0)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
        verbose_name="顶级分类",
    )

    class Meta:
        verbose_name = "栏目分类"
        verbose_name_plural = "栏目分类"

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} -> {self.name}"
        return self.name


class Tag(models.Model):
    name = models.CharField("标签名称", max_length=100, unique=True)
    slug = models.SlugField("标签缩略名", max_length=120, unique=True, allow_unicode=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)

    class Meta:
        verbose_name = "文章标签"
        verbose_name_plural = "文章标签"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Article(models.Model):
    STATUS_CHOICES = (
        ("draft", "草稿"),
        ("published", "已发布"),
        ("archived", "已下线/归档"),
    )

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


class SeoMetadata(models.Model):
    article = models.OneToOneField(Article, on_delete=models.CASCADE, related_name="seo_metadata")
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
        verbose_name = "SEO 元数据"
        verbose_name_plural = "SEO 元数据"

    def __str__(self):
        return f"SEO: {self.article.title}"


class KnowledgeSource(models.Model):
    SOURCE_TYPE_CHOICES = (
        ("article", "文章"),
        ("faq", "FAQ"),
        ("category", "分类页"),
        ("tag", "标签页"),
        ("product", "产品页"),
        ("service", "服务页"),
        ("brand", "品牌页"),
        ("case", "案例页"),
        ("term", "术语库"),
        ("seo_rule", "SEO 规则"),
    )

    source_type = models.CharField("来源类型", max_length=32, choices=SOURCE_TYPE_CHOICES)
    source_id = models.PositiveBigIntegerField("来源 ID")
    title = models.CharField("来源标题", max_length=255)
    url = models.CharField("来源 URL", max_length=500)
    content_hash = models.CharField("内容哈希", max_length=71)
    is_active = models.BooleanField("是否启用", default=True)
    last_indexed_at = models.DateTimeField("最近索引时间", null=True, blank=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "知识来源"
        verbose_name_plural = "知识来源"
        ordering = ["source_type", "source_id"]
        constraints = [
            models.UniqueConstraint(fields=["source_type", "source_id"], name="uniq_knowledge_source_type_id"),
        ]

    def __str__(self):
        return f"{self.source_type}:{self.source_id}:{self.title}"


class KnowledgeChunk(models.Model):
    source = models.ForeignKey(KnowledgeSource, on_delete=models.CASCADE, related_name="chunks", verbose_name="知识来源")
    chunk_index = models.PositiveIntegerField("分块序号")
    chunk_text = models.TextField("分块文本")
    chunk_hash = models.CharField("分块哈希", max_length=71)
    embedding = VectorField("向量", dimensions=1536, null=True, blank=True)
    embedding_model = models.CharField("向量模型", max_length=255, blank=True)
    embedding_dimensions = models.PositiveIntegerField("向量维度", default=1536)
    metadata = models.JSONField("附加元数据", default=dict, blank=True)
    is_active = models.BooleanField("是否启用", default=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "知识分块"
        verbose_name_plural = "知识分块"
        ordering = ["source_id", "chunk_index"]
        constraints = [
            models.UniqueConstraint(fields=["source", "chunk_index"], name="uniq_knowledge_chunk_source_index"),
        ]
        indexes = [
            models.Index(fields=["is_active", "source"], name="simple_cms__knowledg_iact_idx"),
            models.Index(fields=["chunk_hash"], name="simple_cms__knowledg_hash_idx"),
        ]

    def __str__(self):
        return f"{self.source}#{self.chunk_index}"


class FaqItem(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="faq_items")
    question = models.CharField("问题", max_length=255)
    answer = models.TextField("答案")
    sort_order = models.PositiveIntegerField("排序权重", default=0)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "FAQ 条目"
        verbose_name_plural = "FAQ 条目"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.question


class ArticleSlugHistory(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="slug_histories")
    slug = models.SlugField("历史SEO URL", max_length=255, unique=True, allow_unicode=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="记录时间")

    class Meta:
        verbose_name = "文章历史链接"
        verbose_name_plural = "文章历史链接"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.slug} -> {self.article.slug}"


class ArticleRevision(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="revisions")
    title_snapshot = models.CharField("标题快照", max_length=255)
    slug_snapshot = models.SlugField("SEO URL快照", max_length=255, allow_unicode=True)
    body_snapshot = models.TextField("正文快照")
    status_snapshot = models.CharField("状态快照", max_length=20, choices=Article.STATUS_CHOICES)
    publish_date_snapshot = models.DateTimeField("发布时间快照", null=True, blank=True)
    meta_description_snapshot = models.TextField("SEO描述快照", blank=True)
    category_name_snapshot = models.CharField("分类快照", max_length=100, blank=True)
    changed_fields = models.CharField("变更字段", max_length=255)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="保存时间")

    class Meta:
        verbose_name = "文章版本"
        verbose_name_plural = "文章版本"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.article.title} @ {self.created_at:%Y-%m-%d %H:%M}"





