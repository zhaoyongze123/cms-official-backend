from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import django
from django.db import transaction
from django.core.files.storage import default_storage


def _bootstrap_django() -> None:
    current_file = Path(__file__).resolve()
    repo_root = current_file.parent.parent
    cms_api_path = repo_root / "apps" / "cms-api"
    for path in (repo_root, cms_api_path):
        path_text = str(path)
        if path_text not in sys.path:
            sys.path.insert(0, path_text)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
    django.setup()


_bootstrap_django()

from cms_apps.articles.models import Article
from apps.media_library.models import ImageItem


WHITESPACE_RE = re.compile(r"\s+")
ESCAPED_NEWLINE_RE = re.compile(r"(?:\\[nrt])+")


@dataclass
class HtmlNode:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    text_parts: list[str] = field(default_factory=list)
    children: list["HtmlNode"] = field(default_factory=list)

    @property
    def text(self) -> str:
        parts = list(self.text_parts)
        for child in self.children:
            if child.text:
                parts.append(child.text)
        return normalize_text(" ".join(part for part in parts if part))


class ArticleHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = HtmlNode(tag="body")
        self.stack: list[HtmlNode] = [self.root]
        self.void_tags = {"img", "br", "hr", "meta", "link", "input"}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = HtmlNode(tag=tag, attrs={key: value or "" for key, value in attrs})
        self.stack[-1].children.append(node)
        if tag not in self.void_tags:
            self.stack.append(node)

    def handle_endtag(self, tag: str) -> None:
        if len(self.stack) > 1 and self.stack[-1].tag == tag:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        self.stack[-1].text_parts.append(data)


def create_text_node(text: str) -> dict[str, Any]:
    return {"type": "text", "text": text}


def create_paragraph(text: str, block_id: str) -> dict[str, Any]:
    return {
        "type": "paragraph",
        "attrs": {"blockId": block_id},
        "content": [create_text_node(text)],
    }


def create_heading(text: str, level: int, block_id: str) -> dict[str, Any]:
    return {
        "type": "heading",
        "attrs": {"level": level, "blockId": block_id},
        "content": [create_text_node(text)],
    }


def create_list_item(text: str, block_id: str) -> dict[str, Any]:
    return {
        "type": "listItem",
        "attrs": {"blockId": block_id},
        "content": [
            {
                "type": "paragraph",
                "attrs": {"blockId": f"{block_id}_p"},
                "content": [create_text_node(text)],
            }
        ],
    }


def _normalize_html(value: str) -> str:
    return (value or "").strip()


def normalize_legacy_html(value: str) -> str:
    normalized = value or ""
    normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")
    normalized = normalized.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\r", "\n").replace("\\t", " ")
    normalized = ESCAPED_NEWLINE_RE.sub("\n", normalized)
    normalized = normalized.replace('src="/media/', 'src="/django/media/')
    normalized = normalized.replace("src='/media/", "src='/django/media/")
    normalized = normalized.replace('href="/media/', 'href="/django/media/')
    normalized = normalized.replace("href='/media/", "href='/django/media/")
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def normalize_text(value: str) -> str:
    compact = WHITESPACE_RE.sub(" ", value or "")
    return compact.strip()


def _has_renderable_content_json(value: Any) -> bool:
    if not isinstance(value, dict):
        return False
    content = value.get("content")
    return isinstance(content, list) and len(content) > 0


def _extract_image_src(node: HtmlNode) -> str:
    if node.tag == "img":
        return node.attrs.get("src", "")
    for child in node.children:
        src = _extract_image_src(child)
        if src:
            return src
    return ""


def _storage_path_from_src(src: str) -> str:
    normalized = (src or "").strip()
    if not normalized:
        return ""
    if normalized.startswith("http://") or normalized.startswith("https://"):
        return ""
    if normalized.startswith("/django/media/"):
        return normalized.removeprefix("/django/media/")
    if normalized.startswith("/media/"):
        return normalized.removeprefix("/media/")
    return normalized.lstrip("/")


def _collect_missing_image_sources(content: list[dict[str, Any]]) -> list[str]:
    missing_sources: list[str] = []
    for block in content:
        if block.get("type") != "image":
            continue
        attrs = block.get("attrs") or {}
        src = attrs.get("src", "")
        storage_path = _storage_path_from_src(src)
        if storage_path and not default_storage.exists(storage_path):
            missing_sources.append(src)
    return missing_sources


def _normalize_public_media_src(src: str) -> str:
    normalized = (src or "").strip()
    if not normalized:
        return ""
    if normalized.startswith("http://") or normalized.startswith("https://"):
        return normalized
    if normalized.startswith("/django/media/"):
        return normalized
    if normalized.startswith("/media/"):
        return f"/django{normalized}"
    return normalized


def _find_image_id_for_src(src: str) -> int | None:
    if not src:
        return None
    normalized = src.replace("/django/media/", "/media/")
    file_name = normalized.removeprefix("/media/")
    image = ImageItem.objects.filter(file=file_name).first()
    if image is not None:
        return image.id

    filename = Path(normalized).name
    if not filename:
        return None
    image = ImageItem.objects.filter(file__iendswith=f"/{filename}").order_by("id").first()
    if image is not None:
        return image.id

    if file_name and default_storage.exists(file_name):
        created = ImageItem.objects.create(
            title=filename,
            alt_text="",
            file=file_name,
        )
        return created.id
    return None


def build_tiptap_document_from_html(html: str) -> dict[str, Any]:
    parser = ArticleHtmlParser()
    parser.feed(f"<body>{html}</body>")
    parser.close()

    block_index = 1

    def next_block_id() -> str:
        nonlocal block_index
        value = f"blk_backfill_{block_index}"
        block_index += 1
        return value

    def convert_node(node: HtmlNode) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        node_text = node.text

        if node.tag in {"h1", "h2", "h3"} and node_text:
            level = int(node.tag[1])
            items.append(create_heading(node_text, level, next_block_id()))
            return items

        if node.tag == "p" and node_text:
            items.append(create_paragraph(node_text, next_block_id()))
            return items

        if node.tag == "blockquote":
            if node_text:
                items.append(create_paragraph(node_text, next_block_id()))
            return items

        if node.tag == "pre":
            if node_text:
                items.append(
                    {
                        "type": "codeBlock",
                        "attrs": {"blockId": next_block_id()},
                        "content": [create_text_node(node_text)],
                    }
                )
            return items

        if node.tag in {"ul", "ol"}:
            list_items = []
            for child in node.children:
                child_text = child.text
                if child.tag == "li" and child_text:
                    list_items.append(create_list_item(child_text, next_block_id()))
            if list_items:
                items.append(
                    {
                        "type": "bulletList" if node.tag == "ul" else "orderedList",
                        "attrs": {"blockId": next_block_id()},
                        "content": list_items,
                    }
                )
            return items

        if node.tag in {"figure", "img"}:
            src = _normalize_public_media_src(_extract_image_src(node))
            caption = ""
            for child in node.children:
                if child.tag == "figcaption" and child.text:
                    caption = child.text
                    break
            if src:
                image_id = _find_image_id_for_src(src)
                items.append(
                    {
                        "type": "image",
                        "attrs": {
                            "blockId": next_block_id(),
                            "src": src,
                            "alt": node.attrs.get("alt", ""),
                            "title": caption,
                            "imageId": image_id,
                        },
                    }
                )
            if caption:
                items.append(create_paragraph(caption, next_block_id()))
            return items

        if node.tag == "table":
            if node_text:
                items.append(create_paragraph(node_text, next_block_id()))
            return items

        if node.tag == "br":
            return items

        for child in node.children:
            items.extend(convert_node(child))

        if not items and node_text and node.tag in {"div", "section", "article", "main"}:
            items.append(create_paragraph(node_text, next_block_id()))
        return items

    content: list[dict[str, Any]] = []
    for child in parser.root.children:
        content.extend(convert_node(child))

    return {
        "tiptap_schema_version": "v1",
        "type": "doc",
        "content": content,
    }


def select_target_articles() -> list[Article]:
    articles = Article.objects.all().order_by("id")
    targets: list[Article] = []
    for article in articles:
        body_html = _normalize_html(article.body)
        content_html = _normalize_html(article.content_html)
        has_json = _has_renderable_content_json(article.content_json)
        if not body_html:
            continue
        normalized_body_html = normalize_legacy_html(body_html)
        normalized_content_html = normalize_legacy_html(content_html) if content_html else ""
        if body_html != normalized_body_html or content_html != normalized_content_html:
            targets.append(article)
            continue
        if content_html and has_json and not article_needs_rebuild(article):
            continue
        targets.append(article)
    return targets


def article_needs_rebuild(article: Article) -> bool:
    content_json = article.content_json if isinstance(article.content_json, dict) else {}
    content = content_json.get("content")
    if not isinstance(content, list) or not content:
        return True

    for block in content:
        if block.get("type") == "image":
            attrs = block.get("attrs") or {}
            src = attrs.get("src", "")
            if src.startswith("/media/") or "\\n" in src or attrs.get("imageId") in ("", None):
                return True
            continue
        if block.get("type") != "paragraph":
            continue
        parts = block.get("content")
        if not isinstance(parts, list):
            continue
        texts = [part.get("text", "") for part in parts if isinstance(part, dict)]
        joined = "".join(texts)
        if "\n" in joined or "\\n" in joined or "\\t" in joined or not joined.strip():
            return True
    return False


@transaction.atomic
def backfill_articles() -> dict[str, Any]:
    targets = select_target_articles()
    updated: list[dict[str, Any]] = []

    for article in targets:
        body_html = normalize_legacy_html(_normalize_html(article.body))
        content_html = normalize_legacy_html(_normalize_html(article.content_html)) or body_html
        if _has_renderable_content_json(article.content_json) and not article_needs_rebuild(article):
            content_json = article.content_json
        else:
            content_json = build_tiptap_document_from_html(content_html)
        content_blocks = content_json.get("content", []) if isinstance(content_json, dict) else []
        missing_image_sources = _collect_missing_image_sources(content_blocks)

        article.body = body_html
        article.content_html = content_html
        article.content_json = content_json
        article.save(update_fields=["body", "content_html", "content_json", "updated_at"])
        updated.append(
            {
                "article_id": article.id,
                "slug": article.slug,
                "body_length": len(body_html),
                "content_html_length": len(content_html),
                "content_block_count": len(content_blocks),
                "missing_image_count": len(missing_image_sources),
                "missing_image_sources": missing_image_sources[:10],
            }
        )

    return {
        "matched": len(targets),
        "updated": len(updated),
        "items": updated,
    }


if __name__ == "__main__":
    result = backfill_articles()
    print(json.dumps(result, ensure_ascii=False, indent=2))
