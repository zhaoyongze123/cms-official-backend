import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    ai_provider: str
    ai_prompt_version: str
    internal_api_token: str
    siliconflow_base_url: str


settings = Settings(
    ai_provider=os.getenv("AI_PROVIDER", "mock"),
    ai_prompt_version=os.getenv("AI_PROMPT_VERSION", "v1"),
    internal_api_token=os.getenv("INTERNAL_API_TOKEN", ""),
    siliconflow_base_url=os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1"),
)
