"""AI 四项生成配置服务。"""

from __future__ import annotations

from typing import Any

from django.db import transaction

from apps.sys_settings.models import SiteSetting


AI_GENERATION_PROMPT_KEYS = (
    "review_prompt",
    "metadata_prompt",
    "faq_prompt",
    "internal_links_prompt",
    "alt_prompt",
    "title_prompt",
    "slug_prompt",
    "tags_prompt",
    "description_prompt",
)


def mask_api_key(value: str) -> str:
    token = str(value or "").strip()
    if not token:
        return ""
    if len(token) <= 8:
        return f"{token[:2]}***{token[-1:]}"
    return f"{token[:4]}***{token[-4:]}"


def get_site_setting() -> SiteSetting:
    setting, _ = SiteSetting.objects.get_or_create(id=1)
    if not setting.ai_generate_model_options:
        setting.ai_generate_model_options = list(SiteSetting.DEFAULT_AI_GENERATE_MODEL_OPTIONS)
        setting.save(update_fields=["ai_generate_model_options"])
    return setting


def serialize_ai_generation_config(setting: SiteSetting | None = None) -> dict[str, Any]:
    config = setting or get_site_setting()
    return {
        "models": {
            "review": config.ai_review_model,
            "generation": config.ai_generate_model,
            "alt": config.ai_alt_model or config.ai_generate_model,
        },
        "api_key": {
            "has_value": bool(str(config.siliconflow_api_key or "").strip()),
            "masked_value": mask_api_key(config.siliconflow_api_key),
        },
        "model_options": config.ai_generate_model_options or list(SiteSetting.DEFAULT_AI_GENERATE_MODEL_OPTIONS),
        "prompts": {
            "review_prompt": config.ai_review_prompt,
            "metadata_prompt": config.ai_metadata_prompt,
            "faq_prompt": config.ai_faq_prompt,
            "internal_links_prompt": config.ai_internal_links_prompt,
            "alt_prompt": config.ai_alt_prompt,
            "title_prompt": config.ai_generate_title_prompt,
            "slug_prompt": config.ai_generate_slug_prompt,
            "tags_prompt": config.ai_generate_tags_prompt,
            "description_prompt": config.ai_generate_description_prompt,
        },
    }


def build_ai_generation_request_config() -> dict[str, Any]:
    payload = serialize_ai_generation_config()
    return {
        "models": payload["models"],
        "prompts": payload["prompts"],
    }


@transaction.atomic
def update_ai_generation_config(payload: dict[str, Any]) -> dict[str, Any]:
    setting = get_site_setting()
    model = str(payload.get("model") or "").strip()
    if model:
        setting.ai_generate_model = model

    api_key_payload = payload.get("api_key")
    if api_key_payload is not None:
        if not isinstance(api_key_payload, dict):
            raise ValueError("api_key 必须是对象。")
        if api_key_payload.get("clear") is True:
            setting.siliconflow_api_key = ""
        elif "value" in api_key_payload:
            api_key_value = str(api_key_payload.get("value") or "").strip()
            if api_key_value:
                setting.siliconflow_api_key = api_key_value

    models = payload.get("models")
    if models is not None:
        if not isinstance(models, dict):
            raise ValueError("models 必须是对象。")
        review_model = str(models.get("review") or "").strip()
        generation_model = str(models.get("generation") or "").strip()
        alt_model = str(models.get("alt") or "").strip()
        if review_model:
            setting.ai_review_model = review_model
        if generation_model:
            setting.ai_generate_model = generation_model
        if alt_model:
            setting.ai_alt_model = alt_model

    raw_model_options = payload.get("model_options")
    if raw_model_options is not None:
        if not isinstance(raw_model_options, list):
            raise ValueError("model_options 必须是数组。")
        normalized_options: list[str] = []
        for item in raw_model_options:
            option = str(item).strip()
            if option and option not in normalized_options:
                normalized_options.append(option)
        setting.ai_generate_model_options = normalized_options or list(SiteSetting.DEFAULT_AI_GENERATE_MODEL_OPTIONS)

    prompts = payload.get("prompts")
    if prompts is not None:
        if not isinstance(prompts, dict):
            raise ValueError("prompts 必须是对象。")
        prompt_field_map = {
            "review_prompt": "ai_review_prompt",
            "metadata_prompt": "ai_metadata_prompt",
            "faq_prompt": "ai_faq_prompt",
            "internal_links_prompt": "ai_internal_links_prompt",
            "alt_prompt": "ai_alt_prompt",
            "title_prompt": "ai_generate_title_prompt",
            "slug_prompt": "ai_generate_slug_prompt",
            "tags_prompt": "ai_generate_tags_prompt",
            "description_prompt": "ai_generate_description_prompt",
        }
        for key, field_name in prompt_field_map.items():
            if key in prompts:
                value = str(prompts.get(key) or "").strip()
                if not value:
                    raise ValueError(f"{key} 不能为空。")
                setattr(setting, field_name, value)

    if not str(setting.ai_alt_model or "").strip():
        setting.ai_alt_model = setting.ai_generate_model

    for active_model in [setting.ai_review_model, setting.ai_generate_model, setting.ai_alt_model]:
        if active_model in (setting.ai_generate_model_options or []):
            continue
        options = list(setting.ai_generate_model_options or [])
        options.insert(0, active_model)
        deduped: list[str] = []
        for option in options:
            if option and option not in deduped:
                deduped.append(option)
        setting.ai_generate_model_options = deduped

    setting.save()
    return serialize_ai_generation_config(setting)
