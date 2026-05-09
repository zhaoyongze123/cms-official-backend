from __future__ import annotations

from fastapi import Header

from ai_service.core.config import settings
from ai_service.core.errors import ServiceError


def validate_internal_token(x_internal_token: str | None = Header(default=None, alias="X-Internal-Token")) -> str:
    if not settings.internal_api_token:
        raise ServiceError(
            status_code=503,
            code="internal_token_not_configured",
            message="内部服务令牌未配置",
        )

    if x_internal_token != settings.internal_api_token:
        raise ServiceError(
            status_code=401,
            code="invalid_internal_token",
            message="内部服务令牌无效",
        )

    return x_internal_token
