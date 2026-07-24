"""发布前检查与发布服务。"""

from __future__ import annotations

from dataclasses import dataclass

from django.core.exceptions import ValidationError
from django.db import transaction

from cms_apps.articles.api.services import serialize_article
from cms_apps.articles.models import Article
from cms_apps.common.services.public_cache import invalidate_public_web_cache
from cms_apps.publishing.selectors import get_article_or_none


@dataclass(frozen=True)
class CheckItem:
    code: str
    message: str


def _build_passed_item(code: str, message: str) -> dict[str, str]:
    return {"code": code, "message": message}


def _build_check_result(errors: list[dict[str, str]], warnings: list[dict[str, str]], passed: list[dict[str, str]]):
    return {
        "errors": errors,
        "warnings": warnings,
        "passed": passed,
    }


def _append_unique(items: list[dict[str, str]], code: str, message: str):
    if not any(item["code"] == code for item in items):
        items.append({"code": code, "message": message})


def build_seo_check_result(article: Article) -> dict[str, list[dict[str, str]]]:
    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    passed: list[dict[str, str]] = []

    if not article.title or len(article.title.strip()) < 10:
        errors.append({"code": "title_missing_or_short", "message": "标题不能为空，且建议不少于 10 个字符。"})
    else:
        passed.append(_build_passed_item("title_present", "标题已填写且长度基本可用。"))

    if not article.slug:
        errors.append({"code": "slug_missing", "message": "slug 不能为空。"})
    else:
        passed.append(_build_passed_item("slug_present", "slug 已设置。"))

    summary = article.meta_description or ""
    if summary.strip():
        if len(summary.strip()) < 50:
            warnings.append({"code": "summary_too_short", "message": "摘要较短，建议补充到更适合搜索展示的长度。"})
        else:
            passed.append(_build_passed_item("summary_present", "摘要已填写。"))
    else:
        warnings.append({"code": "summary_missing", "message": "未填写摘要，系统将依赖正文截取。"})

    has_content_json = bool(article.content_json)
    has_content_html = bool((article.content_html or "").strip())
    if has_content_json or has_content_html:
        passed.append(_build_passed_item("content_present", "正文内容已存在。"))
    else:
        errors.append({"code": "content_missing", "message": "正文内容不能为空。"})

    if article.status != "published":
        warnings.append({"code": "status_not_published", "message": "文章当前不是已发布状态。"})
    else:
        passed.append(_build_passed_item("status_published", "文章状态为已发布。"))

    if article.publish_date is not None:
        passed.append(_build_passed_item("publish_date_present", "发布时间已设置。"))
    else:
        warnings.append({"code": "publish_date_missing", "message": "未设置发布时间，发布后将自动补齐。"})

    return _build_check_result(errors, warnings, passed)


def build_publish_result(article: Article) -> dict[str, object]:
    return {
        "article": serialize_article(article),
        "seo_check": build_seo_check_result(article),
    }


@transaction.atomic
def publish_article(article_id: int) -> tuple[Article, dict[str, list[dict[str, str]]]]:
    article = get_article_or_none(article_id)
    if article is None:
        raise ValidationError({"article_id": "文章不存在。"})

    seo_check = build_seo_check_result(article)
    if seo_check["errors"]:
        raise ValidationError(
            {
                "seo_check": "存在 SEO 错误，禁止发布。",
                "seo_check_details": seo_check["errors"],
            }
        )

    article.status = "published"
    article.save()
    article.refresh_from_db()
    transaction.on_commit(invalidate_public_web_cache)
    return article, seo_check
