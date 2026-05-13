from django.apps import AppConfig


class PublishingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cms_apps.publishing"
    label = "cms_publishing"
    verbose_name = "发布流程"

