"""文章 API 路由。"""

from django.urls import path

from .site_setting_views import public_site_setting_view
from .wechat_views import wechat_js_config_view
from .views import (
    article_detail_view,
    article_preview_link_view,
    article_list_view,
    category_list_view,
    public_article_detail_by_slug_view,
    public_article_list_view,
    public_article_preview_view,
    tag_list_view,
)
from .page_views import managed_page_detail_view, managed_page_list_view, public_managed_page_view


urlpatterns = [
    path("articles/", article_list_view, name="api_articles"),
    path("articles/<int:article_id>/", article_detail_view, name="api_article_detail"),
    path("articles/<int:article_id>/preview-link/", article_preview_link_view, name="api_article_preview_link"),
    path("pages/", managed_page_list_view, name="api_managed_pages"),
    path("pages/<int:page_id>/", managed_page_detail_view, name="api_managed_page_detail"),
    path("categories/", category_list_view, name="api_categories"),
    path("tags/", tag_list_view, name="api_tags"),
    path("public/site-settings/", public_site_setting_view, name="api_public_site_settings"),
    path("public/wechat/js-config/", wechat_js_config_view, name="api_public_wechat_js_config"),
    path("public/articles/", public_article_list_view, name="api_public_articles"),
    path("public/article-previews/<str:token>/", public_article_preview_view, name="api_public_article_preview"),
    path("public/pages/<path:path>/", public_managed_page_view, name="api_public_managed_page"),
    path("public/articles/<path:slug>/", public_article_detail_by_slug_view, name="api_public_article_detail"),
]
