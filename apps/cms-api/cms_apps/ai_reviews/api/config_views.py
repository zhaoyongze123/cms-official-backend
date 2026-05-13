"""AI 模型与 Prompt 配置 API。"""

from __future__ import annotations

import json

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from cms_apps.ai_reviews.services import fetch_siliconflow_models, serialize_ai_generation_config, update_ai_generation_config


def _parse_json_body(request):
    if not request.body:
        return {}
    try:
        body = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValidationError({"body": "请求体必须是合法的 JSON。"}) from exc
    if not isinstance(body, dict):
        raise ValidationError({"body": "请求体必须是对象。"})
    return body


def _validation_error_response(error: ValidationError):
    if hasattr(error, "message_dict"):
        details = error.message_dict
    else:
        details = {"detail": error.messages}
    return JsonResponse({"error": {"code": "validation_error", "message": "参数校验失败", "details": details}}, status=400)


@require_http_methods(["GET", "PATCH"])
@csrf_exempt
def ai_generation_config_view(request):
    if request.method == "GET":
        payload = serialize_ai_generation_config()
        try:
            payload["siliconflow_models"] = fetch_siliconflow_models()
            payload["siliconflow_models_error"] = None
        except Exception as error:
            payload["siliconflow_models"] = payload.get("model_options", [])
            payload["siliconflow_models_error"] = str(error)
        return JsonResponse(payload, status=200)

    try:
        payload = _parse_json_body(request)
        config = update_ai_generation_config(payload)
    except ValidationError as error:
        return _validation_error_response(error)
    except ValueError as error:
        return JsonResponse(
            {
                "error": {
                    "code": "validation_error",
                    "message": "参数校验失败",
                    "details": {"detail": [str(error)]},
                }
            },
            status=400,
        )

    return JsonResponse(config, status=200)
