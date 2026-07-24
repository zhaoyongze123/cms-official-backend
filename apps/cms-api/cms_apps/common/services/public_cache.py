"""公开站点缓存失效服务。"""

from __future__ import annotations

import logging
from urllib import error as urllib_error
from urllib import request as urllib_request

from django.conf import settings


logger = logging.getLogger(__name__)
PUBLIC_CACHE_REQUEST_TIMEOUT = 3


def invalidate_public_web_cache() -> bool:
    """通知 public-web 清理公开 API 缓存，失败时不影响业务写入。"""
    endpoint = str(getattr(settings, "PUBLIC_WEB_REVALIDATE_URL", "") or "").strip()
    token = str(getattr(settings, "PUBLIC_WEB_REVALIDATE_TOKEN", "") or "").strip()
    if not endpoint or not token:
        logger.warning("公开站点缓存失效未配置 endpoint 或 token。")
        return False

    request = urllib_request.Request(
        endpoint,
        data=b"{}",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Revalidate-Token": token,
        },
        method="POST",
    )
    try:
        opener = urllib_request.build_opener(urllib_request.ProxyHandler({}))
        with opener.open(request, timeout=PUBLIC_CACHE_REQUEST_TIMEOUT) as response:
            if response.status < 200 or response.status >= 300:
                logger.warning("公开站点缓存失效接口返回状态码 %s。", response.status)
                return False
    except (urllib_error.HTTPError, urllib_error.URLError, TimeoutError) as error:
        logger.warning("公开站点缓存失效请求失败：%s。", error)
        return False

    return True
