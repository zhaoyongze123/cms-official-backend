"""文章 API 的序列化与写入服务。"""

from __future__ import annotations

import hashlib
import json

from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_datetime
from django.utils.text import slugify

from apps.media_library.models import ImageItem
from cms_apps.articles.models import Article, Category, Tag
from cms_apps.faq.models import FaqItem
from cms_apps.seo.models import SeoMetadata


ARTICLE_SCHEMA_VERSION = "v1"


def _json_default(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def build_content_hash(article: Article) -> str:
    payload = {
        "article_id": article.id,
        "title": article.title,
        "slug": article.slug,
        "status": article.status,
        "summary": article.meta_description or "",
        "category_id": article.category_id,
        "tag_ids": list(article.tags.order_by("id").values_list("id", flat=True)),
        "content_json": article.content_json or {},
        "content_html": article.content_html or "",
        "published_at": article.publish_date.isoformat() if article.publish_date else None,
        "updated_at": article.updated_at.isoformat() if article.updated_at else None,
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=_json_default).encode("utf-8")
    return f"sha256:{hashlib.sha256(encoded).hexdigest()}"


def serialize_category(category: Category | None) -> dict[str, object] | None:
    if category is None:
        return None
    return {
        "category_id": category.id,
        "name": category.name,
        "slug": category.slug,
    }


def serialize_tag(tag: Tag) -> dict[str, object]:
    return {
        "tag_id": tag.id,
        "name": tag.name,
        "slug": tag.slug,
    }


def serialize_image(image: ImageItem | None) -> dict[str, object] | None:
    if image is None:
        return None
    try:
        file_url = image.file.url
    except ValueError:
        file_url = ""
    return {
        "image_id": image.id,
        "title": image.title,
        "alt_text": image.alt_text,
        "file_url": file_url,
    }


def serialize_faq_item(item: FaqItem) -> dict[str, object]:
    return {
        "question": item.question,
        "answer": item.answer,
        "sort_order": item.sort_order,
    }


def serialize_article(article: Article, seo_payload: dict[str, object] | None = None) -> dict[str, object]:
    tags = list(article.tags.all().order_by("id"))
    faq_items = list(article.faq_items.all().order_by("sort_order", "id"))
    seo_metadata = getattr(article, "seo_metadata", None)
    canonical_url = ""
    robots = "index,follow"
    meta_title = ""
    meta_description = article.meta_description or ""
    meta_keywords = ""
    og_title = ""
    og_description = ""
    og_image = None
    og_image_url = ""

    if seo_metadata is not None:
        canonical_url = seo_metadata.canonical_url or ""
        robots = seo_metadata.robots or robots
        meta_title = seo_metadata.meta_title or ""
        meta_description = seo_metadata.meta_description or meta_description
        meta_keywords = seo_metadata.meta_keywords or ""
        og_title = seo_metadata.og_title or ""
        og_description = seo_metadata.og_description or ""
        og_image = serialize_image(getattr(seo_metadata, "og_image", None))
        if seo_metadata.og_image_id and getattr(seo_metadata.og_image, "file", None):
            try:
                og_image_url = seo_metadata.og_image.file.url
            except ValueError:
                og_image_url = ""

    return {
        "article_id": article.id,
        "schema_version": ARTICLE_SCHEMA_VERSION,
        "title": article.title,
        "summary": meta_description,
        "slug": article.slug,
        "status": article.status,
        "category": serialize_category(article.category),
        "cover_image": serialize_image(getattr(article, "cover_image", None)),
        "tags": [serialize_tag(tag) for tag in tags],
        "content_json": article.content_json or {},
        "content_html": article.content_html or "",
        "content_hash": build_content_hash(article),
        "published_at": article.publish_date.isoformat() if article.publish_date else None,
        "updated_at": article.updated_at.isoformat(),
        "faq_items": [serialize_faq_item(item) for item in faq_items],
        "seo": {
            "meta_title": meta_title,
            "meta_description": meta_description,
            "meta_keywords": meta_keywords,
            "canonical_url": canonical_url,
            "robots": robots,
            "og_title": og_title,
            "og_description": og_description,
            "og_image": og_image,
            "og_image_url": og_image_url,
        },
        "seo_payload": seo_payload or {},
    }


def _build_unique_category_slug(name: str) -> str:
    base = slugify(name, allow_unicode=True) or "category"
    candidate = base
    suffix = 1
    while Category.objects.filter(slug=candidate).exists():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def _coerce_category(category_id=None, category_name=None):
    if category_id not in (None, ""):
        try:
            return Category.objects.get(pk=category_id)
        except Category.DoesNotExist as exc:
            raise ValidationError({"category_id": "指定的分类不存在。"}) from exc

    if category_name in (None, ""):
        return None
    if not isinstance(category_name, str):
        raise ValidationError({"category_name": "category_name 必须是字符串。"})

    normalized_name = category_name.strip()
    if not normalized_name:
        return None

    existing_category = Category.objects.filter(name=normalized_name).first()
    if existing_category is not None:
        return existing_category

    return Category.objects.create(
        name=normalized_name,
        slug=_build_unique_category_slug(normalized_name),
    )


def _coerce_tags(tag_ids):
    if tag_ids in (None, ""):
        return []
    if not isinstance(tag_ids, (list, tuple)):
        raise ValidationError({"tag_ids": "tag_ids 必须是整数数组。"})
    tags = list(Tag.objects.filter(pk__in=tag_ids))
    if len(tags) != len(set(int(tag_id) for tag_id in tag_ids)):
        raise ValidationError({"tag_ids": "包含不存在的标签 ID。"})
    tag_by_id = {tag.id: tag for tag in tags}
    return [tag_by_id[int(tag_id)] for tag_id in tag_ids]


def _build_unique_tag_slug(name: str) -> str:
    base = slugify(name, allow_unicode=True) or "tag"
    candidate = base
    suffix = 1
    while Tag.objects.filter(slug=candidate).exists():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def _coerce_tag_names(tag_names):
    if tag_names in (None, ""):
        return []
    if not isinstance(tag_names, (list, tuple)):
        raise ValidationError({"tag_names": "tag_names 必须是字符串数组。"})

    normalized_names = []
    for item in tag_names:
        text = str(item or "").strip()
        if text and text not in normalized_names:
            normalized_names.append(text)

    resolved_tags = []
    for name in normalized_names:
        existing_tag = Tag.objects.filter(name=name).first()
        if existing_tag is not None:
            resolved_tags.append(existing_tag)
            continue
        resolved_tags.append(Tag.objects.create(name=name, slug=_build_unique_tag_slug(name)))

    return resolved_tags


def _coerce_content_json(value):
    if value in (None, ""):
        return {}
    if not isinstance(value, dict):
        raise ValidationError({"content_json": "content_json 必须是对象。"})
    return value


def _coerce_content_html(payload, existing_article: Article | None = None):
    if "content_html" in payload:
        value = payload.get("content_html")
        if value in (None, ""):
            return ""
        if not isinstance(value, str):
            raise ValidationError({"content_html": "content_html 必须是字符串。"})
        return value
    if "body" in payload:
        value = payload.get("body")
        if value in (None, ""):
            return ""
        if not isinstance(value, str):
            raise ValidationError({"body": "body 必须是字符串。"})
        return value
    if existing_article is not None:
        return existing_article.content_html or ""
    return ""


def _coerce_status(value):
    if value in (None, ""):
        return None
    if value not in {"draft", "published", "archived"}:
        raise ValidationError({"status": "status 仅支持 draft、published、archived。"})
    return value


def _coerce_publish_date(value):
    if value in (None, ""):
        return None
    if hasattr(value, "isoformat"):
        return value
    if not isinstance(value, str):
        raise ValidationError({"publish_date": "publish_date 必须是 ISO 8601 字符串。"})
    parsed = parse_datetime(value)
    if parsed is None:
        raise ValidationError({"publish_date": "publish_date 不是合法的日期时间格式。"})
    return parsed


def _coerce_string(value, field_name: str, allow_blank: bool = True) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ValidationError({field_name: f"{field_name} 必须是字符串。"})
    normalized = value.strip()
    if not allow_blank and not normalized:
        raise ValidationError({field_name: f"{field_name} 不能为空。"})
    return normalized


def _coerce_image(image_id, field_name: str) -> ImageItem | None:
    if image_id in (None, ""):
        return None
    try:
        return ImageItem.objects.get(pk=image_id)
    except ImageItem.DoesNotExist as exc:
        raise ValidationError({field_name: "指定的图片不存在。"}) from exc


def _coerce_faq_items(items) -> list[dict[str, object]]:
    if items in (None, ""):
        return []
    if not isinstance(items, list):
        raise ValidationError({"faq_items": "faq_items 必须是数组。"})

    normalized_items: list[dict[str, object]] = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValidationError({"faq_items": [f"第 {index + 1} 项必须是对象。"]})
        question = _coerce_string(item.get("question"), f"faq_items[{index}].question")
        answer = _coerce_string(item.get("answer"), f"faq_items[{index}].answer")
        sort_order = item.get("sort_order", index + 1)
        if sort_order in (None, ""):
            sort_order = index + 1
        if not isinstance(sort_order, int):
            raise ValidationError({"faq_items": [f"第 {index + 1} 项 sort_order 必须是整数。"]})
        if not question or not answer:
            continue
        normalized_items.append(
            {
                "question": question,
                "answer": answer,
                "sort_order": sort_order,
            }
        )
    return normalized_items


def _get_or_create_seo_metadata(article: Article) -> SeoMetadata:
    seo_metadata = getattr(article, "seo_metadata", None)
    if seo_metadata is not None:
        return seo_metadata
    seo_metadata, _ = SeoMetadata.objects.get_or_create(article=article)
    setattr(article, "seo_metadata", seo_metadata)
    return seo_metadata


def _apply_seo_payload(article: Article, payload: dict[str, object]) -> None:
    seo_field_map = {
        "meta_title": "meta_title",
        "meta_keywords": "meta_keywords",
        "canonical_url": "canonical_url",
        "robots": "robots",
        "og_title": "og_title",
        "og_description": "og_description",
    }
    should_update_seo = any(key in payload for key in (*seo_field_map.keys(), "og_image_id"))
    if not should_update_seo:
        return

    seo_metadata = _get_or_create_seo_metadata(article)
    update_fields: list[str] = []

    for payload_key, model_field in seo_field_map.items():
        if payload_key not in payload:
            continue
        value = _coerce_string(payload.get(payload_key), payload_key)
        setattr(seo_metadata, model_field, value)
        update_fields.append(model_field)

    if "og_image_id" in payload:
        seo_metadata.og_image = _coerce_image(payload.get("og_image_id"), "og_image_id")
        update_fields.append("og_image")

    if update_fields:
        seo_metadata.save(update_fields=list(dict.fromkeys(update_fields)))


def _replace_faq_items(article: Article, payload: dict[str, object]) -> None:
    if "faq_items" not in payload:
        return
    faq_items = _coerce_faq_items(payload.get("faq_items"))
    article.faq_items.all().delete()
    if not faq_items:
        return
    FaqItem.objects.bulk_create(
        [
            FaqItem(
                article=article,
                question=item["question"],
                answer=item["answer"],
                sort_order=item["sort_order"],
            )
            for item in faq_items
        ]
    )


def apply_article_payload(article: Article, payload: dict[str, object], partial: bool = False) -> Article:
    if not partial or "title" in payload:
        title = payload.get("title")
        if title in (None, ""):
            raise ValidationError({"title": "title 不能为空。"})
        if not isinstance(title, str):
            raise ValidationError({"title": "title 必须是字符串。"})
        article.title = title

    if not partial or "slug" in payload:
        slug = payload.get("slug")
        if slug not in (None, ""):
            if not isinstance(slug, str):
                raise ValidationError({"slug": "slug 必须是字符串。"})
            article.slug = slug

    if not partial or "summary" in payload or "meta_description" in payload:
        summary = payload.get("summary", payload.get("meta_description", article.meta_description))
        if summary is None:
            summary = ""
        if not isinstance(summary, str):
            raise ValidationError({"summary": "summary 必须是字符串。"})
        article.meta_description = summary
        seo_metadata = getattr(article, "seo_metadata", None)
        if seo_metadata is not None:
            seo_metadata.meta_description = summary

    if not partial or "status" in payload:
        status = _coerce_status(payload.get("status"))
        if status is not None:
            article.status = status

    if not partial or "category_id" in payload or "category_name" in payload:
        article.category = _coerce_category(
            payload.get("category_id"),
            payload.get("category_name"),
        )

    if "cover_image_id" in payload:
        article.cover_image = _coerce_image(payload.get("cover_image_id"), "cover_image_id")

    if "content_json" in payload or not partial:
        article.content_json = _coerce_content_json(payload.get("content_json"))

    article.content_html = _coerce_content_html(payload, article)

    if "publish_date" in payload:
        article.publish_date = _coerce_publish_date(payload.get("publish_date"))

    article.save()

    if not partial or "summary" in payload or "meta_description" in payload:
        seo_metadata = _get_or_create_seo_metadata(article)
        seo_metadata.meta_description = article.meta_description
        seo_metadata.save(update_fields=["meta_description"])

    _apply_seo_payload(article, payload)
    _replace_faq_items(article, payload)

    if "tag_names" in payload:
        article.tags.set(_coerce_tag_names(payload.get("tag_names")))
    elif "tag_ids" in payload:
        article.tags.set(_coerce_tags(payload.get("tag_ids")))

    return article
