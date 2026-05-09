"""
URL configuration for WagtailCMS project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.http import JsonResponse
from django.urls import include, path

from apps.simple_cms.sitemaps import ArticleSitemap, CategorySitemap, StaticViewSitemap, TagSitemap


def health_view(request):
    return JsonResponse(
        {
            "status": "ok",
            "service": "django-web",
            "settings_module": getattr(settings, "SETTINGS_MODULE", ""),
        }
    )


urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/health/", health_view, name="health"),
    path(
        "sitemap.xml",
        sitemap,
        {"sitemaps": {"static": StaticViewSitemap, "articles": ArticleSitemap, "categories": CategorySitemap, "tags": TagSitemap}},
        name="django.contrib.sitemaps.views.sitemap",
    ),
    
    # Simple CMS Front-end
    path("", include("apps.simple_cms.urls")),
    
    # CKEditor Uploader URLs
    path("ckeditor/", include("ckeditor_uploader.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
