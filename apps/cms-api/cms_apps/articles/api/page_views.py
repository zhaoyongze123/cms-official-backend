from __future__ import annotations

import json
import re

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from cms_apps.articles.models import ManagedPage


def _error(code: str, message: str, status: int = 400, details=None):
    return JsonResponse({"error": {"code": code, "message": message, "details": details or {}}}, status=status)


def _serialize_page(page: ManagedPage) -> dict[str, object]:
    return {
        "page_id": page.id,
        "path": page.path,
        "title": page.title,
        "template_key": page.template_key,
        "status": page.status,
        "content_json": page.content_json or {},
        "content_html": page.content_html or "",
        "meta_description": page.meta_description,
        "canonical_url": page.canonical_url,
        "robots": page.robots,
        "created_at": page.created_at.isoformat(),
        "updated_at": page.updated_at.isoformat(),
    }


def _parse_body(request):
    try:
        return json.loads(request.body or "{}")
    except (TypeError, json.JSONDecodeError):
        raise ValidationError("请求体必须是 JSON。")


def _staff_only(request):
    return request.user.is_authenticated and request.user.is_staff


def _apply_payload(page: ManagedPage, payload: dict, partial: bool = False):
    allowed = ("path", "title", "template_key", "status", "content_json", "content_html", "meta_description", "canonical_url", "robots")
    for field in allowed:
        if partial and field not in payload:
            continue
        if field in payload:
            value = payload[field]
            if field in ("content_json",) and not isinstance(value, dict):
                raise ValidationError({field: "必须是 JSON 对象。"})
            if field in ("path", "title", "template_key", "status", "content_html", "meta_description", "canonical_url", "robots") and not isinstance(value, str):
                raise ValidationError({field: "必须是字符串。"})
            setattr(page, field, value)
    if re.search(r"<\s*script\b|\bon[a-z]+\s*=", page.content_html or "", re.IGNORECASE):
        raise ValidationError({"content_html": "页面内容不允许包含脚本或内联事件处理器，请通过前端模板实现交互。"})
    if not page.path.strip():
        raise ValidationError({"path": "页面 URL 不能为空。"})
    if not page.title.strip():
        raise ValidationError({"title": "页面标题不能为空。"})
    if page.path.strip().startswith(("/api", "/_next", "/articles")):
        raise ValidationError({"path": "该 URL 前缀由系统保留，不能用于页面内容。"})
    page.full_clean()
    page.save()


@require_http_methods(["GET", "POST"])
@csrf_exempt
def managed_page_list_view(request):
    if request.method == "GET":
        if not _staff_only(request):
            return _error("forbidden", "需要后台编辑权限。", 403)
        return JsonResponse([_serialize_page(page) for page in ManagedPage.objects.all()], safe=False)
    if not _staff_only(request):
        return _error("forbidden", "需要后台编辑权限。", 403)
    try:
        page = ManagedPage()
        _apply_payload(page, _parse_body(request))
    except ValidationError as exc:
        return _error("validation_error", "页面字段校验失败。", 400, getattr(exc, "message_dict", str(exc)))
    return JsonResponse(_serialize_page(page), status=201)


@require_http_methods(["GET", "PATCH", "DELETE"])
@csrf_exempt
def managed_page_detail_view(request, page_id):
    page = ManagedPage.objects.filter(pk=page_id).first()
    if page is None:
        return _error("not_found", "页面不存在。", 404)
    if not _staff_only(request):
        return _error("forbidden", "需要后台编辑权限。", 403)
    if request.method == "GET":
        return JsonResponse(_serialize_page(page))
    if request.method == "DELETE":
        page.delete()
        return JsonResponse({}, status=204)
    try:
        _apply_payload(page, _parse_body(request), partial=True)
    except ValidationError as exc:
        return _error("validation_error", "页面字段校验失败。", 400, getattr(exc, "message_dict", str(exc)))
    return JsonResponse(_serialize_page(page))


@require_http_methods(["GET"])
def public_managed_page_view(request, path):
    normalized_path = f"/{path.strip().strip('/') or ''}".rstrip("/") or "/"
    page = ManagedPage.objects.filter(path=normalized_path, status="published").first()
    if page is None:
        return _error("not_found", "页面不存在。", 404)
    return JsonResponse(_serialize_page(page))
