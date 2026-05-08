"""
URL configuration for WagtailCMS project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("django-admin/", admin.site.urls),
    
    # Simple CMS Front-end
    path("", include("apps.simple_cms.urls")),
    
    # CKEditor Uploader URLs
    path("ckeditor/", include("ckeditor_uploader.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
