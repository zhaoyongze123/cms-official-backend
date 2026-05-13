from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cms_apps.analytics"
    label = "cms_analytics"
    verbose_name = "数据分析"

