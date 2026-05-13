"""SiliconFlow 模型列表读取服务。"""

from __future__ import annotations

from typing import Any

import httpx
from django.conf import settings

from .configuration import get_site_setting


def resolve_siliconflow_api_key() -> str:
    setting_api_key = str(get_site_setting().siliconflow_api_key or "").strip()
    if setting_api_key:
        return setting_api_key
    return str(getattr(settings, "SILICONFLOW_API_KEY", "") or "").strip()


def fetch_siliconflow_models() -> list[str]:
    api_key = resolve_siliconflow_api_key()
    if not api_key:
        raise ValueError("硅基流动 API Key 未配置，无法读取模型列表。")

    base_url = str(getattr(settings, "SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1") or "").rstrip("/")
    timeout = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)
    response = httpx.get(
        f"{base_url}/models",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=timeout,
    )
    response.raise_for_status()
    payload = response.json()
    rows = payload.get("data") or []
    if not isinstance(rows, list):
        raise ValueError("硅基流动模型列表返回结构不符合预期。")

    models: list[str] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        model_id = row.get("id")
        if isinstance(model_id, str) and model_id.strip() and model_id not in models:
            models.append(model_id.strip())
    if not models:
        raise ValueError("硅基流动模型列表为空。")
    return models
