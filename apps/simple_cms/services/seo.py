from __future__ import annotations

import json
import re
from dataclasses import dataclass
from html import unescape
from typing import Any, Iterable
from urllib.parse import urljoin

from django.conf import settings
from django.utils.html import strip_tags
from django.utils.text import slugify

from apps.sys_settings.models import SiteSetting


def _clean_text(value: str | None) -> str:
    if not value:
        return ""
    text = strip_tags(str(value))
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _truncate_text(value: str, limit: int) -> str:
    text = _clean_text(value)
    if len(text) <= limit:
        return text
    return text[: max(limit - 1, 0)].rstrip() + "…"


def _first_site_setting() -> SiteSetting | None:
    try:
        return SiteSetting.objects.first()
    except Exception:
        return None


def _build_absolute_url(path_or_url: str, request: Any | None = None, site_url: str | None = None) -> str:
    if not path_or_url:
        return ""
    if re.match(r"^https?://", path_or_url):
        return path_or_url
    if request is not None:
        return request.build_absolute_uri(path_or_url)

    base_url = (site_url or getattr(settings, "SITE_URL", "") or "").strip()
    if base_url:
        return urljoin(base_url.rstrip("/") + "/", path_or_url.lstrip("/"))
    return path_or_url


def _get_image_url(image: Any | None, request: Any | None = None, site_url: str | None = None) -> str:
    if not image:
        return ""
    file_field = getattr(image, "file", None)
    url = getattr(file_field, "url", "") if file_field else ""
    if not url:
        return ""
    return _build_absolute_url(url, request=request, site_url=site_url)


def _iter_tiptap_nodes(nodes: Iterable[dict[str, Any]]) -> Iterable[dict[str, Any]]:
    for node in nodes or []:
        if isinstance(node, dict):
            yield node
            children = node.get("content") or []
            if children:
                yield from _iter_tiptap_nodes(children)


def _node_text(node: dict[str, Any]) -> str:
    if node.get("type") == "text":
        return str(node.get("text") or "")

    texts: list[str] = []
    for child in node.get("content") or []:
        if isinstance(child, dict):
            texts.append(_node_text(child))
    return "".join(texts) if texts else _clean_text(node.get("text"))


def _build_anchor(text: str, used_anchors: set[str], fallback_prefix: str = "section") -> str:
    anchor = slugify(text, allow_unicode=True) or fallback_prefix
    candidate = anchor
    suffix = 2
    while candidate in used_anchors:
        candidate = f"{anchor}-{suffix}"
        suffix += 1
    used_anchors.add(candidate)
    return candidate


def build_toc(article: Any) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    used_anchors: set[str] = set()

    content_json = getattr(article, "content_json", None) or {}
    for node in _iter_tiptap_nodes(content_json.get("content") or []):
        if node.get("type") != "heading":
            continue

        attrs = node.get("attrs") or {}
        level = attrs.get("level")
        if not isinstance(level, int) or level < 1 or level > 6:
            level = 2

        title = _clean_text(_node_text(node))
        if not title:
            continue

        block_id = attrs.get("blockId") or attrs.get("id") or ""
        anchor = _build_anchor(block_id or title, used_anchors, fallback_prefix="heading")
        items.append({"level": level, "title": title, "anchor": anchor, "block_id": block_id})

    if items:
        return items

    body_html = getattr(article, "body", "") or ""
    pattern = re.compile(r"<h([1-6])[^>]*>(.*?)</h\1>", re.IGNORECASE | re.DOTALL)
    for match in pattern.finditer(body_html):
        level = int(match.group(1))
        title = _clean_text(match.group(2))
        if not title:
            continue
        anchor = _build_anchor(title, used_anchors, fallback_prefix="heading")
        items.append({"level": level, "title": title, "anchor": anchor, "block_id": ""})
    return items


def build_breadcrumbs(article: Any, request: Any | None = None, site_url: str | None = None) -> list[dict[str, str]]:
    breadcrumbs: list[dict[str, str]] = [{"name": "首页", "item": _build_absolute_url("/", request=request, site_url=site_url)}]
    category = getattr(article, "category", None)
    if category:
        category_url = category.get_absolute_url() if hasattr(category, "get_absolute_url") else f"/category/{category.slug}/"
        breadcrumbs.append({"name": category.name, "item": _build_absolute_url(category_url, request=request, site_url=site_url)})
    breadcrumbs.append(
        {
            "name": getattr(article, "title", ""),
            "item": _build_absolute_url(article.get_absolute_url(), request=request, site_url=site_url),
        }
    )
    return breadcrumbs


def _build_breadcrumb_list_json_ld(breadcrumbs: list[dict[str, str]]) -> dict[str, Any] | None:
    if not breadcrumbs:
        return None
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": index + 1, "name": item.get("name", ""), "item": item.get("item", "")}
            for index, item in enumerate(breadcrumbs)
        ],
    }


def _build_article_json_ld(
    article: Any,
    title: str,
    description: str,
    canonical: str,
    request: Any | None = None,
    site_url: str | None = None,
) -> dict[str, Any]:
    seo_metadata = getattr(article, "seo_metadata", None)
    image = _get_image_url(getattr(seo_metadata, "og_image", None), request=request, site_url=site_url) if seo_metadata else ""
    if not image:
        image = _get_image_url(getattr(article, "cover_image", None), request=request, site_url=site_url)

    data: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "url": canonical,
        "mainEntityOfPage": canonical,
    }
    if image:
        data["image"] = [image]
    if getattr(article, "publish_date", None):
        data["datePublished"] = article.publish_date.isoformat()
    if getattr(article, "updated_at", None):
        data["dateModified"] = article.updated_at.isoformat()
    if getattr(article, "category", None):
        data["articleSection"] = article.category.name
    return data


def _build_faq_json_ld(article: Any) -> dict[str, Any] | None:
    faq_manager = getattr(article, "faq_items", None)
    faq_items = list(faq_manager.all()) if hasattr(faq_manager, "all") else []
    faq_entities = []
    for item in faq_items:
        question = _clean_text(item.question)
        answer = _clean_text(item.answer)
        if question and answer:
            faq_entities.append(
                {
                    "@type": "Question",
                    "name": question,
                    "acceptedAnswer": {"@type": "Answer", "text": answer},
                }
            )
    if not faq_entities:
        return None
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faq_entities}


def build_json_ld(
    article: Any,
    title: str,
    description: str,
    canonical: str,
    breadcrumbs: list[dict[str, str]] | None = None,
    request: Any | None = None,
    site_url: str | None = None,
) -> list[dict[str, Any]]:
    payload: list[dict[str, Any]] = [
        _build_article_json_ld(
            article=article,
            title=title,
            description=description,
            canonical=canonical,
            request=request,
            site_url=site_url,
        )
    ]
    faq_json_ld = _build_faq_json_ld(article)
    if faq_json_ld:
        payload.append(faq_json_ld)
    breadcrumb_json_ld = _build_breadcrumb_list_json_ld(breadcrumbs or [])
    if breadcrumb_json_ld:
        payload.append(breadcrumb_json_ld)
    return payload


@dataclass(slots=True)
class SeoContextBuilder:
    article: Any
    request: Any | None = None
    site_url: str | None = None

    def _get_seo_metadata(self) -> Any | None:
        try:
            return self.article.seo_metadata
        except Exception:
            return None

    def _get_setting(self) -> SiteSetting | None:
        return _first_site_setting()

    def _get_title(self) -> str:
        seo_metadata = self._get_seo_metadata()
        if seo_metadata and seo_metadata.meta_title:
            return _clean_text(seo_metadata.meta_title)
        article_title = _clean_text(getattr(self.article, "title", ""))
        setting = self._get_setting()
        site_title = getattr(setting, "site_title", "") if setting else ""
        return f"{article_title} - {site_title}" if site_title and article_title else article_title or _clean_text(site_title)

    def _get_description(self) -> str:
        seo_metadata = self._get_seo_metadata()
        if seo_metadata and seo_metadata.meta_description:
            return _truncate_text(seo_metadata.meta_description, 160)
        article_description = getattr(self.article, "meta_description", "") or ""
        if article_description:
            return _truncate_text(article_description, 160)
        body_html = getattr(self.article, "content_html", "") or getattr(self.article, "body", "")
        return _truncate_text(body_html, 160)

    def _get_canonical(self) -> str:
        seo_metadata = self._get_seo_metadata()
        if seo_metadata and seo_metadata.canonical_url:
            return _build_absolute_url(seo_metadata.canonical_url, request=self.request, site_url=self.site_url)
        return _build_absolute_url(self.article.get_absolute_url(), request=self.request, site_url=self.site_url)

    def _get_robots(self) -> str:
        seo_metadata = self._get_seo_metadata()
        return seo_metadata.robots if seo_metadata and seo_metadata.robots else "index,follow"

    def _get_og_title(self, title: str) -> str:
        seo_metadata = self._get_seo_metadata()
        return _clean_text(seo_metadata.og_title) if seo_metadata and seo_metadata.og_title else title

    def _get_og_description(self, description: str) -> str:
        seo_metadata = self._get_seo_metadata()
        return _truncate_text(seo_metadata.og_description, 200) if seo_metadata and seo_metadata.og_description else description

    def _get_og_image(self) -> str:
        seo_metadata = self._get_seo_metadata()
        if seo_metadata and getattr(seo_metadata, "og_image", None):
            image_url = _get_image_url(seo_metadata.og_image, request=self.request, site_url=self.site_url)
            if image_url:
                return image_url
        return _get_image_url(getattr(self.article, "cover_image", None), request=self.request, site_url=self.site_url)

    def build(self) -> dict[str, Any]:
        title = self._get_title()
        description = self._get_description()
        canonical = self._get_canonical()
        breadcrumbs = build_breadcrumbs(self.article, request=self.request, site_url=self.site_url)
        og = {
            "title": self._get_og_title(title),
            "description": self._get_og_description(description),
            "image": self._get_og_image(),
            "url": canonical,
            "type": "article",
        }
        context: dict[str, Any] = {
            "seo_context_schema_version": "v1",
            "title": title,
            "description": description,
            "canonical": canonical,
            "robots": self._get_robots(),
            "og": og,
            "json_ld": build_json_ld(
                article=self.article,
                title=title,
                description=description,
                canonical=canonical,
                breadcrumbs=breadcrumbs,
                request=self.request,
                site_url=self.site_url,
            ),
            "breadcrumbs": breadcrumbs,
        }
        setting = self._get_setting()
        twitter = {
            "card": "summary_large_image" if og["image"] else "summary",
            "title": og["title"],
            "description": og["description"],
        }
        site_title = getattr(setting, "site_title", "") if setting else ""
        if site_title:
            twitter["site"] = site_title
        if og["image"]:
            twitter["image"] = og["image"]
        context["twitter"] = twitter
        context["json_ld_markup"] = json.dumps(context["json_ld"], ensure_ascii=False)
        return context


def build_seo_context(article: Any, request: Any | None = None, site_url: str | None = None) -> dict[str, Any]:
    return SeoContextBuilder(article=article, request=request, site_url=site_url).build()
