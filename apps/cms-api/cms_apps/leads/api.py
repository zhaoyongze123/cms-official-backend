from __future__ import annotations

import hashlib
import json

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import ContactLead
from .services import queue_immediate_notifications


def _error(code: str, message: str, details: dict[str, object], status: int) -> JsonResponse:
    return JsonResponse({"error": {"code": code, "message": message, "details": details}}, status=status)


def _parse_payload(request) -> dict[str, object]:
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValidationError({"body": "请求体必须是合法的 JSON。"}) from exc
    if not isinstance(payload, dict):
        raise ValidationError({"body": "请求体必须是对象。"})
    return payload


def _rate_limit(request) -> bool:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    address = forwarded.split(",", 1)[0].strip() or request.META.get("REMOTE_ADDR", "unknown")
    key = "lead-submit:" + hashlib.sha256(address.encode("utf-8")).hexdigest()
    if cache.add(key, 1, timeout=3600):
        return True
    try:
        return cache.incr(key) <= 10
    except ValueError:
        return True


@require_POST
@csrf_exempt
def public_lead_create_view(request):
    if not _rate_limit(request):
        return _error("rate_limited", "提交过于频繁，请稍后再试。", {}, 429)
    try:
        payload = _parse_payload(request)
    except ValidationError as exc:
        return _error("validation_error", "参数校验失败", exc.message_dict, 400)

    if str(payload.get("website", "")).strip():
        return JsonResponse({"status": "accepted"}, status=201)
    if payload.get("privacy_consent") is not True:
        return _error("validation_error", "请先阅读并同意隐私政策。", {"privacy_consent": ["请先阅读并同意隐私政策。"]}, 400)

    lead = ContactLead(
        company_name=str(payload.get("company_name", "")),
        contact_name=str(payload.get("contact_name", "")),
        phone=str(payload.get("phone", "")),
        email=str(payload.get("email", "")),
        requirement=str(payload.get("requirement", "")),
        source=str(payload.get("source", "homepage_ai_drive_demo"))[:80],
        referrer=str(payload.get("referrer", ""))[:500],
        consent_at=timezone.now(),
    )
    try:
        lead.full_clean()
    except ValidationError as exc:
        return _error("validation_error", "参数校验失败", exc.message_dict, 400)

    with transaction.atomic():
        lead.save()
        queue_immediate_notifications(lead)
    return JsonResponse({"status": "accepted", "lead_id": lead.pk}, status=201)
