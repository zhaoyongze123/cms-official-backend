from __future__ import annotations

import os
from dataclasses import dataclass


def _env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def _internal_token_default() -> str:
    # 本地开发未提供服务间令牌时，回退到固定测试值，避免联调直接失败。
    if _env_bool("DEBUG", "false"):
        return "dev-internal-token"
    return ""


@dataclass(frozen=True)
class Settings:
    ai_provider: str
    ai_model: str
    ai_prompt_version: str
    internal_api_token: str
    siliconflow_base_url: str
    service_name: str
    enable_response_headers: bool

    @property
    def normalized_provider(self) -> str:
        provider = self.ai_provider.strip().lower()
        if provider in {"siliconflow", "silicon_flow"}:
            return "siliconflow"
        return "mock"


settings = Settings(
    ai_provider=os.getenv("AI_PROVIDER", "mock"),
    ai_model=os.getenv("AI_MODEL", "mock-reviewer"),
    ai_prompt_version=os.getenv("AI_PROMPT_VERSION", "v1"),
    internal_api_token=os.getenv("INTERNAL_API_TOKEN", _internal_token_default()),
    siliconflow_base_url=os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1"),
    service_name=os.getenv("SERVICE_NAME", "ai-service"),
    enable_response_headers=_env_bool("ENABLE_RESPONSE_HEADERS", "true"),
)
