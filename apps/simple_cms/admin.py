from django.contrib import admin
from django.utils import timezone

from .models import Article, ArticleRevision, Category, FaqItem, KnowledgeChunk, KnowledgeSource, SeoMetadata, Tag


class ArticleRevisionInline(admin.TabularInline):
    model = ArticleRevision
    extra = 0
    can_delete = False
    verbose_name = "历史版本"
    verbose_name_plural = "历史版本"
    fields = (
        "created_at",
        "changed_fields",
        "title_snapshot",
        "slug_snapshot",
        "status_snapshot",
        "publish_date_snapshot",
    )
    readonly_fields = fields
    ordering = ("-created_at",)

    def has_add_permission(self, request, obj=None):
        return False


class FaqItemInline(admin.TabularInline):
    model = FaqItem
    extra = 0
    fields = ("sort_order", "question", "answer")
    ordering = ("sort_order", "id")


class SeoMetadataInline(admin.StackedInline):
    model = SeoMetadata
    extra = 0
    max_num = 1
    fields = (
        "meta_title",
        "meta_description",
        "meta_keywords",
        "canonical_url",
        "robots",
        "og_title",
        "og_description",
        "og_image",
    )


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "slug")
    list_filter = ("parent",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("sort_order", "name")


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "status", "publish_date", "created_at", "updated_at")
    list_filter = ("status", "category", "created_at")
    search_fields = ("title", "slug", "body", "content_html")
    date_hierarchy = "created_at"
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("tags",)
    inlines = (SeoMetadataInline, FaqItemInline, ArticleRevisionInline)
    actions = ("action_publish_now", "action_move_to_draft", "action_archive")

    fieldsets = (
        (
            "基础信息",
            {
                "fields": ("title", "slug", "category", "cover_image", "tags"),
                "classes": ("wide", "admin-section"),
            },
        ),
        (
            "正文内容",
            {
                "fields": ("body", "content_json", "content_html"),
                "classes": ("admin-section",),
            },
        ),
        (
            "发布设置",
            {
                "fields": ("status", "publish_date"),
                "classes": ("admin-section",),
            },
        ),
        (
            "排序与置顶",
            {
                "fields": ("is_pinned", "pinned_at", "sort_order"),
                "classes": ("admin-section",),
            },
        ),
        (
            "SEO 优化",
            {
                "fields": ("meta_description",),
                "classes": ("admin-section",),
            },
        ),
    )

    class Media:
        js = ("js/admin_article_draft_guard.js",)

    @admin.action(description="批量发布（立即生效）")
    def action_publish_now(self, request, queryset):
        now = timezone.now()
        count = 0
        for article in queryset:
            article.status = "published"
            article.publish_date = now
            article.save()
            count += 1
        self.message_user(request, f"已发布 {count} 篇文章")

    @admin.action(description="批量转为草稿")
    def action_move_to_draft(self, request, queryset):
        count = 0
        for article in queryset:
            article.status = "draft"
            article.publish_date = None
            article.save()
            count += 1
        self.message_user(request, f"已转为草稿 {count} 篇文章")

    @admin.action(description="批量归档下线")
    def action_archive(self, request, queryset):
        count = 0
        for article in queryset:
            article.status = "archived"
            article.save()
            count += 1
        self.message_user(request, f"已归档 {count} 篇文章")


@admin.register(KnowledgeSource)
class KnowledgeSourceAdmin(admin.ModelAdmin):
    list_display = ("source_type", "source_id", "title", "is_active", "last_indexed_at", "updated_at")
    list_filter = ("source_type", "is_active")
    search_fields = ("title", "url")
    readonly_fields = ("created_at", "updated_at", "last_indexed_at")


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = ("id", "source", "chunk_index", "embedding_dimensions", "is_active", "updated_at")
    list_filter = ("is_active", "source__source_type")
    search_fields = ("chunk_text", "source__title", "chunk_hash")
    readonly_fields = ("created_at", "updated_at")




