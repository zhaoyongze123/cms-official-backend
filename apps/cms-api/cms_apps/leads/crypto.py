"""官网线索邮件配置的凭据加密工具。"""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet() -> Fernet:
    """优先使用独立密钥，未配置时基于 Django 密钥派生。"""
    configured_key = settings.LEAD_EMAIL_ENCRYPTION_KEY.strip()
    if configured_key:
        key = configured_key.encode("ascii")
    else:
        key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest())
    return Fernet(key)


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_secret(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeDecodeError, ValueError) as exc:
        raise ValueError("邮件账号密码无法解密，请重新填写并保存。") from exc
