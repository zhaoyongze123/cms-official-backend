from django.apps import AppConfig
from django.contrib.auth.apps import AuthConfig

class SimpleCmsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.simple_cms'
    verbose_name = '内容管理'

class CustomAuthConfig(AuthConfig):
    verbose_name = "用户与策略组管理"
