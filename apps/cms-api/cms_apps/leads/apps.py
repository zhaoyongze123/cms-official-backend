from django.apps import AppConfig


class LeadsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cms_apps.leads"
    label = "cms_leads"
    verbose_name = "咨询线索"
