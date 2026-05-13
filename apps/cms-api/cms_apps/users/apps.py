from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cms_apps.users"
    label = "cms_users"
    verbose_name = "用户与权限"

