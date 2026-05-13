"""文章 API 的查询选择器。"""

from cms_apps.articles.models import Article


def get_article_queryset():
    return (
        Article.objects.select_related("category", "seo_metadata", "cover_image", "seo_metadata__og_image")
        .prefetch_related("tags", "faq_items")
    )


def get_public_article_queryset():
    return get_article_queryset().published()
