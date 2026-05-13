from django.apps import AppConfig


class MediaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cms_apps.media"
    label = "cms_media"
    verbose_name = "媒体资源"

