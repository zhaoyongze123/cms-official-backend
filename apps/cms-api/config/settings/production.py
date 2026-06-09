"""cms-api 生产环境设置。"""

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403

DEBUG = False

if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("生产环境必须配置 ALLOWED_HOSTS")

SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
FORCE_SCRIPT_NAME = "/django"
STATIC_URL = "/django/static/"
MEDIA_URL = "/django/media/"
PUBLIC_MEDIA_URL = "/django/media/"

USE_X_FORWARDED_HOST = True
