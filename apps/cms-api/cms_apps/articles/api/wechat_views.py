"""微信公众号网页 JS-SDK 签名接口。"""

from __future__ import annotations

import hashlib
import secrets
import time
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.http import require_GET


class WechatConfigError(Exception):
    """微信配置或远端接口返回异常。"""


def _configured_domains() -> set[str]:
    raw = getattr(settings, "WECHAT_JS_API_DOMAINS", "")
    if isinstance(raw, str):
        return {item.strip().lower() for item in raw.split(",") if item.strip()}
    return {str(item).strip().lower() for item in raw if str(item).strip()}


def _validate_page_url(value: str) -> str:
    parsed = urlparse(value.strip())
    hostname = (parsed.hostname or "").lower()
    if parsed.scheme not in {"http", "https"} or not hostname:
        raise WechatConfigError("url 必须是完整的 HTTP(S) 页面地址")
    domains = _configured_domains()
    if domains and hostname not in domains and not any(hostname.endswith(f".{domain}") for domain in domains):
        raise WechatConfigError("url 不属于已配置的微信 JS 接口安全域名")
    return value.strip().split("#", 1)[0]


def _wechat_get(path: str, params: dict[str, str]) -> dict:
    base_url = str(getattr(settings, "WECHAT_API_BASE_URL", "https://api.weixin.qq.com")).rstrip("/")
    response = requests.get(f"{base_url}{path}", params=params, timeout=10)
    response.raise_for_status()
    payload = response.json()
    if payload.get("errcode", 0) != 0:
        raise WechatConfigError(payload.get("errmsg") or "微信接口返回错误")
    return payload


def _get_access_token() -> str:
    app_id = getattr(settings, "WECHAT_APP_ID", "")
    app_secret = getattr(settings, "WECHAT_APP_SECRET", "")
    if not app_id or not app_secret:
        raise WechatConfigError("微信公众号 AppID/AppSecret 未配置")
    key = f"wechat:access-token:{app_id}"
    token = cache.get(key)
    if token:
        return str(token)
    payload = _wechat_get("/cgi-bin/token", {"grant_type": "client_credential", "appid": app_id, "secret": app_secret})
    token = payload.get("access_token")
    if not token:
        raise WechatConfigError("微信未返回 access_token")
    cache.set(key, token, max(60, int(payload.get("expires_in", 7200)) - 300))
    return str(token)


def _get_jsapi_ticket() -> str:
    app_id = getattr(settings, "WECHAT_APP_ID", "")
    key = f"wechat:jsapi-ticket:{app_id}"
    ticket = cache.get(key)
    if ticket:
        return str(ticket)
    payload = _wechat_get("/cgi-bin/ticket/getticket", {"access_token": _get_access_token(), "type": "jsapi"})
    ticket = payload.get("ticket")
    if not ticket:
        raise WechatConfigError("微信未返回 jsapi_ticket")
    cache.set(key, ticket, max(60, int(payload.get("expires_in", 7200)) - 300))
    return str(ticket)


@require_GET
def wechat_js_config_view(request):
    try:
        page_url = _validate_page_url(request.GET.get("url", ""))
        timestamp = int(time.time())
        nonce_str = secrets.token_urlsafe(16)
        raw = f"jsapi_ticket={_get_jsapi_ticket()}&noncestr={nonce_str}&timestamp={timestamp}&url={page_url}"
        signature = hashlib.sha1(raw.encode("utf-8")).hexdigest()
    except (WechatConfigError, requests.RequestException, ValueError) as error:
        return JsonResponse({"error": {"code": "wechat_js_config_unavailable", "message": str(error), "details": {}}}, status=503)

    return JsonResponse({"appId": settings.WECHAT_APP_ID, "timestamp": timestamp, "nonceStr": nonce_str, "signature": signature})
