"""cms-api 开发环境设置。"""

from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]
CSRF_TRUSTED_ORIGINS = ["http://localhost", "http://127.0.0.1", "http://localhost:80", "http://127.0.0.1:80"]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
