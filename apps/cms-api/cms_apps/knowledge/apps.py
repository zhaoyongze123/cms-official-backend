from django.apps import AppConfig


class KnowledgeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cms_apps.knowledge"
    label = "cms_knowledge"
    verbose_name = "知识库"

