"""发布流程文章选择器。"""

from cms_apps.articles.models import Article


def get_article_or_none(article_id: int):
    return (
        Article.objects.select_related("category")
        .prefetch_related("tags")
        .filter(pk=article_id)
        .first()
    )

