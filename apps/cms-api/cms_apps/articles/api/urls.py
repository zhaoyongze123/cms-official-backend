"""文章 API 路由。"""

from django.urls import path

from .site_setting_views import public_site_setting_view
from .wechat_views import wechat_js_config_view
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
    path("public/site-settings/", public_site_setting_view, name="api_public_site_settings"),
    path("public/wechat/js-config/", wechat_js_config_view, name="api_public_wechat_js_config"),
    path("public/articles/", public_article_list_view, name="api_public_articles"),
    path("public/articles/<path:slug>/", public_article_detail_by_slug_view, name="api_public_article_detail"),
]
