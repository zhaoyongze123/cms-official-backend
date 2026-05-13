"""cms-api URL 配置。"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sitemaps import Sitemap
from django.contrib.sitemaps.views import sitemap
from django.http import HttpResponse, JsonResponse
from django.urls import include, path

from apps.simple_cms.admin_views import analytics_dashboard_view, next_editor_proxy
from cms_apps.articles.models import Article


def health_view(request):
    return JsonResponse(
        {
            "status": "ok",
            "service": "django-web",
            "settings_module": getattr(settings, "SETTINGS_MODULE", ""),
        }
    )


def favicon_view(request):
    return HttpResponse(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#635bff"/>
<path d="M20 18h24v6H27v10h15v6H27v6h17v6H20V18z" fill="#fff"/>
</svg>""",
        content_type="image/svg+xml",
    )


class PublicArticleSitemap(Sitemap):
    changefreq = "daily"
    priority = 0.8

    def items(self):
        return Article.objects.published()

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        return f"/articles/{obj.slug}/"


urlpatterns = [
    path("favicon.ico", favicon_view, name="favicon"),
    path("sitemap.xml", sitemap, {"sitemaps": {"articles": PublicArticleSitemap}}, name="django_sitemap"),
    path("django-admin/analytics", analytics_dashboard_view, name="analytics_dashboard"),
    path("django-admin/analytics/", analytics_dashboard_view, name="analytics_dashboard_slash"),
    path("django-admin/next-editor/", next_editor_proxy, name="next_editor_proxy_root"),
    path("django-admin/next-editor/<path:resource_path>", next_editor_proxy, name="next_editor_proxy"),
    path("django-admin/", admin.site.urls),
    path("api/health/", health_view, name="health"),
    path("api/", include("cms_apps.articles.api.urls")),
    path("api/", include("cms_apps.ai_reviews.api.urls")),
    path("api/", include("cms_apps.media.api.urls")),
    path("api/", include("cms_apps.publishing.api.urls")),
    path("api/", include("cms_apps.analytics.api.urls")),
    path("", include("apps.simple_cms.urls")),
    path("ckeditor/", include("ckeditor_uploader.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
