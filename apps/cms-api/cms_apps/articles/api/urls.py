"""文章 API 路由。"""

from django.urls import path

from .views import (
    article_detail_view,
    article_list_view,
    category_list_view,
    public_article_detail_by_slug_view,
    public_article_list_view,
    tag_list_view,
)


urlpatterns = [
    path("articles/", article_list_view, name="api_articles"),
    path("articles/<int:article_id>/", article_detail_view, name="api_article_detail"),
    path("categories/", category_list_view, name="api_categories"),
    path("tags/", tag_list_view, name="api_tags"),
    path("public/articles/", public_article_list_view, name="api_public_articles"),
    path("public/articles/<path:slug>/", public_article_detail_by_slug_view, name="api_public_article_detail"),
]
