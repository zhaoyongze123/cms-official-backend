"""Django base settings for CMS project."""

import os

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
)
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

DEBUG = env("DEBUG", default=False)
SECRET_KEY = env("SECRET_KEY", default="")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "django-insecure-dev-only-key"
    else:
        raise ImproperlyConfigured("SECRET_KEY must be set when DEBUG is False")

ALLOWED_HOSTS = env("ALLOWED_HOSTS", default=[])
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS", default=[])

ALIYUN_ACCESS_KEY_ID = env("ALIYUN_ACCESS_KEY_ID", default="")
ALIYUN_ACCESS_KEY_SECRET = env("ALIYUN_ACCESS_KEY_SECRET", default="")
ALIYUN_REGION = env("ALIYUN_REGION", default="")
ALIYUN_DNS_REGION = env("ALIYUN_DNS_REGION", default="cn-hangzhou")
ALIYUN_DNS_DOMAINS = env("ALIYUN_DNS_DOMAINS", default="")
ALIYUN_CMS_NAMESPACE = env("ALIYUN_CMS_NAMESPACE", default="acs_ecs_dashboard")
ALIYUN_CMS_METRICS = env("ALIYUN_CMS_METRICS", default="CPUUtilization,MemoryUtilization,InternetIn,InternetOut")

INSTALLED_APPS = [
    "jazzmin",
    "apps.users.apps.UsersConfig",
    "ckeditor",
    "ckeditor_uploader",
    "apps.simple_cms.apps.SimpleCmsConfig",
    "apps.sys_settings.apps.SysSettingsConfig",
    "apps.media_library.apps.MediaLibraryConfig",
    "apps.aliyun_monitor.apps.AliyunMonitorConfig",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", default="wagtailcms"),
        "USER": env("POSTGRES_USER", default="wagtailcms"),
        "PASSWORD": env("POSTGRES_PASSWORD", default="wagtailcms"),
        "HOST": env("POSTGRES_HOST", default="db"),
        "PORT": env("POSTGRES_PORT", default="5432"),
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://redis:6379/0"),
    }
}

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "zh-hans"
TIME_ZONE = "Asia/Shanghai"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")]

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CKEDITOR_CONFIGS = {
    "default": {
        "toolbar": "Custom",
        "toolbar_Custom": [
            ["Styles", "Format", "Font", "FontSize"],
            ["Bold", "Italic", "Underline", "Strike", "Subscript", "Superscript", "-", "RemoveFormat"],
            ["NumberedList", "BulletedList", "-", "Outdent", "Indent", "-", "Blockquote"],
            ["JustifyLeft", "JustifyCenter", "JustifyRight", "JustifyBlock"],
            ["Link", "Unlink", "Anchor"],
            ["Image", "Table", "HorizontalRule", "SpecialChar"],
            ["TextColor", "BGColor"],
            ["Maximize", "ShowBlocks", "Source"],
        ],
        "width": "100%",
        "height": "600px",
        "toolbarCanCollapse": False,
        "extraPlugins": "uploadimage,uploadwidget,filetools,notification,notificationaggregator",
    }
}
CKEDITOR_UPLOAD_PATH = "uploads/"

JAZZMIN_SETTINGS = {
    "site_title": "企业内容管理系统",
    "site_header": "管理后台",
    "site_brand": "管理控制台",
    "welcome_sign": "欢迎进入管理后台",
    "search_model": ["simple_cms.Article", "users.User"],

    "custom_links": {
        "simple_cms": [{
            "name": "前台首页",
            "url": "/",
            "icon": "fas fa-desktop",
        }],
        "aliyun_monitor": [{
            "name": "云资源概览",
            "url": "/django-admin/aliyun-monitor/",
            "icon": "fas fa-cloud",
        }],
    },

    "topmenu_links": [
        {"name": "管理后台", "url": "admin:index"},
        {"name": "前台首页", "url": "/"},
    ],

    "order_with_respect_to": ["simple_cms", "media_library", "users", "sys_settings", "aliyun_monitor"],

    "hide_apps": [
        "taggit",
    ],

    "icons": {
        "aliyun_monitor": "fas fa-cloud",
        "sys_settings": "fas fa-cogs",
        "users": "fas fa-users-cog",
        "users.User": "fas fa-user",
        "users.ProxyGroup": "fas fa-users",
        "users.AuditLog": "fas fa-clipboard-list",
        "simple_cms.Article": "fas fa-newspaper",
        "simple_cms.Category": "fas fa-tags",
        "media_library.ImageItem": "fas fa-image",
        "media_library.FileItem": "fas fa-file",
        "sys_settings.SiteSetting": "fas fa-sliders-h",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",

    "show_ui_builder": False,
    "custom_css": "css/admin_custom.css",
}

JAZZMIN_UI_TWEAKS = {
    "theme": "litera",
    "dark_mode_theme": "darkly",
}




















