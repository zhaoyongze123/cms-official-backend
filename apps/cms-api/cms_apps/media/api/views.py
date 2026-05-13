"""媒体库 API 视图。"""

from __future__ import annotations

import json
import os

from django.http import QueryDict
from django.http import JsonResponse
from django.http.multipartparser import MultiPartParser, MultiPartParserError
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.media_library.models import FileItem, ImageItem


def _validation_error_response(message: str, details: dict[str, object] | None = None, status: int = 400):
    return JsonResponse(
        {
            "error": {
                "code": "validation_error",
                "message": message,
                "details": details or {},
            }
        },
        status=status,
    )


def _serialize_image(request, image: ImageItem):
    return {
        "image_id": image.id,
        "title": image.title,
        "alt_text": image.alt_text,
        "file_url": request.build_absolute_uri(image.file.url),
        "uploaded_at": image.uploaded_at.isoformat(),
    }


def _serialize_file(request, file_item: FileItem):
    return {
        "file_id": file_item.id,
        "title": file_item.title,
        "file_name": os.path.basename(file_item.file.name),
        "file_url": request.build_absolute_uri(file_item.file.url),
        "uploaded_at": file_item.uploaded_at.isoformat(),
    }


def _parse_json_body(request):
    if not request.body:
        return {}
    try:
        body = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return body if isinstance(body, dict) else None


def _parse_multipart_patch(request):
    try:
        parser = MultiPartParser(request.META, request, request.upload_handlers, request.encoding)
        post_data, files = parser.parse()
    except MultiPartParserError:
        return None, None
    return post_data, files


def _validate_uploaded_image(upload):
    if upload is None:
        return _validation_error_response("缺少上传文件。", {"file": ["请选择图片文件。"]})

    content_type = upload.content_type or ""
    if not content_type.startswith("image/"):
        return _validation_error_response("仅支持图片上传。", {"file": ["当前文件不是图片。"]})

    return None


def _validate_uploaded_file(upload):
    if upload is None:
        return _validation_error_response("缺少上传文件。", {"file": ["请选择附件文件。"]})
    return None


@require_http_methods(["POST"])
@csrf_exempt
def media_upload_view(request):
    upload = request.FILES.get("file")
    upload_error = _validate_uploaded_image(upload)
    if upload_error is not None:
        return upload_error

    title = (request.POST.get("title") or "").strip()
    alt_text = (request.POST.get("alt_text") or "").strip()
    if not title:
        title = os.path.splitext(upload.name)[0]

    image = ImageItem.objects.create(
        title=title,
        alt_text=alt_text,
        file=upload,
    )

    return JsonResponse(_serialize_image(request, image), status=201)


@require_http_methods(["GET"])
def media_image_list_view(request):
    images = ImageItem.objects.all().order_by("-uploaded_at", "-id")[:60]
    return JsonResponse([_serialize_image(request, image) for image in images], safe=False)


@require_http_methods(["GET"])
def media_file_list_view(request):
    files = FileItem.objects.all().order_by("-uploaded_at", "-id")[:60]
    return JsonResponse([_serialize_file(request, file_item) for file_item in files], safe=False)


@require_http_methods(["PATCH"])
@csrf_exempt
def media_image_detail_view(request, image_id: int):
    image = get_object_or_404(ImageItem, pk=image_id)
    content_type = request.content_type or ""
    is_multipart = content_type.startswith("multipart/form-data")

    if is_multipart:
        post_data, files = _parse_multipart_patch(request)
        if post_data is None or files is None:
            return _validation_error_response("请求体必须是合法的 multipart/form-data。", {"body": ["文件表单解析失败。"]})
        payload: QueryDict = post_data
        upload = files.get("file")
    else:
        payload = _parse_json_body(request)
        if payload is None:
            return _validation_error_response("请求体必须是合法的 JSON 对象。", {"body": ["仅支持 JSON 对象。"]})
        upload = None

    update_fields: list[str] = []

    if "title" in payload:
        title = payload.get("title")
        if title is None:
            title = ""
        if not isinstance(title, str):
            return _validation_error_response("图片名称必须是字符串。", {"title": ["title 必须是字符串。"]})
        image.title = title.strip()
        update_fields.append("title")

    if "alt_text" in payload:
        alt_text = payload.get("alt_text")
        if alt_text is None:
            alt_text = ""
        if not isinstance(alt_text, str):
            return _validation_error_response("图片 alt 必须是字符串。", {"alt_text": ["alt_text 必须是字符串。"]})
        image.alt_text = alt_text.strip()
        update_fields.append("alt_text")

    if upload is not None:
        upload_error = _validate_uploaded_image(upload)
        if upload_error is not None:
            return upload_error

        old_file = image.file
        image.file.save(upload.name, upload, save=False)
        if old_file and old_file.name and old_file.name != image.file.name:
            old_file.delete(save=False)
        update_fields.append("file")

        if "title" not in payload:
            image.title = image.title.strip() or os.path.splitext(upload.name)[0]
            if "title" not in update_fields:
                update_fields.append("title")

    if not update_fields:
        return _validation_error_response("缺少可更新字段。", {"fields": ["至少传 title、alt_text 或 file。"]})

    deduped_update_fields = list(dict.fromkeys(update_fields))
    image.save(update_fields=deduped_update_fields)
    return JsonResponse(_serialize_image(request, image))


@require_http_methods(["POST"])
@csrf_exempt
def media_file_upload_view(request):
    upload = request.FILES.get("file")
    upload_error = _validate_uploaded_file(upload)
    if upload_error is not None:
        return upload_error

    title = (request.POST.get("title") or "").strip()
    if not title:
        title = os.path.basename(upload.name)

    file_item = FileItem.objects.create(
        title=title,
        file=upload,
    )

    return JsonResponse(_serialize_file(request, file_item), status=201)
