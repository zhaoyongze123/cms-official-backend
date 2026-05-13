"""发布流程 API 路由。"""

from django.urls import path

from .views import publish_article_view, seo_check_view

urlpatterns = [
    path("articles/<int:article_id>/seo-check/", seo_check_view, name="api_article_seo_check"),
    path("articles/<int:article_id>/publish/", publish_article_view, name="api_article_publish"),
]

