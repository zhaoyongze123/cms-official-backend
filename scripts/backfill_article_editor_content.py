from __future__ import annotations

import json
import os
import re
import sys
import argparse
from dataclasses import dataclass, field
from html import escape as escape_html
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
    parts: list[str | "HtmlNode"] = field(default_factory=list)

    @property
    def text(self) -> str:
        if self.parts:
            values = [part if isinstance(part, str) else part.text for part in self.parts]
            return normalize_text(" ".join(part for part in values if part))
        values = list(self.text_parts)
        for child in self.children:
            if child.text:
                values.append(child.text)
        return normalize_text(" ".join(part for part in values if part))


class ArticleHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = HtmlNode(tag="body")
        self.stack: list[HtmlNode] = [self.root]
        self.void_tags = {"img", "br", "hr", "meta", "link", "input"}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = HtmlNode(tag=tag, attrs={key: value or "" for key, value in attrs})
        self.stack[-1].children.append(node)
        self.stack[-1].parts.append(node)
        if tag not in self.void_tags:
            self.stack.append(node)

    def handle_endtag(self, tag: str) -> None:
        if len(self.stack) > 1 and self.stack[-1].tag == tag:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        self.stack[-1].text_parts.append(data)
        self.stack[-1].parts.append(data)


def create_text_node(text: str, marks: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    node: dict[str, Any] = {"type": "text", "text": text}
    if marks:
        node["marks"] = marks
    return node


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


def create_paragraph_content(content: list[dict[str, Any]], block_id: str) -> dict[str, Any]:
    node: dict[str, Any] = {
        "type": "paragraph",
        "attrs": {"blockId": block_id},
    }
    if content:
        node["content"] = content
    return node


def _normalize_inline_text(value: str) -> str:
    if not value or not value.strip():
        return ""
    normalized = WHITESPACE_RE.sub(" ", value)
    if "\n" in value or "\r" in value or "\t" in value:
        return normalized.strip()
    return normalized


def _inline_content(node: HtmlNode, marks: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    active_marks = list(marks or [])
    if node.tag in {"strong", "b"}:
        active_marks.append({"type": "bold"})
    elif node.tag in {"em", "i"}:
        active_marks.append({"type": "italic"})
    elif node.tag == "u":
        active_marks.append({"type": "underline"})
    elif node.tag in {"s", "strike", "del"}:
        active_marks.append({"type": "strike"})
    elif node.tag == "code":
        active_marks.append({"type": "code"})
    elif node.tag == "mark":
        active_marks.append({"type": "highlight"})
    elif node.tag == "a":
        href = node.attrs.get("href", "").strip()
        if href:
            active_marks.append(
                {
                    "type": "link",
                    "attrs": {
                        "href": href,
                        "target": node.attrs.get("target") or "_blank",
                    },
                }
            )

    result: list[dict[str, Any]] = []
    for part in node.parts:
        if isinstance(part, str):
            text = _normalize_inline_text(part)
            if text:
                result.append(create_text_node(text, active_marks))
            continue
        if part.tag in {"img", "br"}:
            continue
        result.extend(_inline_content(part, active_marks))
    return result


def _find_node(node: HtmlNode, tag: str) -> HtmlNode | None:
    if node.tag == tag:
        return node
    for child in node.children:
        found = _find_node(child, tag)
        if found is not None:
            return found
    return None


def _find_link_href(node: HtmlNode) -> str:
    link = _find_node(node, "a")
    return link.attrs.get("href", "").strip() if link else ""


def _create_caption_paragraph(caption: str, source_url: str, block_id: str) -> dict[str, Any] | None:
    caption_text = normalize_text(caption)
    content: list[dict[str, Any]] = []
    if caption_text:
        content.append(create_text_node(caption_text))
    if source_url:
        if content:
            content.append(create_text_node(" "))
        content.append(
            create_text_node(
                "打开原图",
                [{"type": "link", "attrs": {"href": source_url, "target": "_blank"}}],
            )
        )
    return create_paragraph_content(content, block_id) if content else None


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
            items.append(
                {
                    "type": "heading",
                    "attrs": {"level": level, "blockId": next_block_id()},
                    "content": _inline_content(node),
                }
            )
            return items

        if node.tag == "p":
            inline_content = _inline_content(node)
            if inline_content:
                items.append(create_paragraph_content(inline_content, next_block_id()))
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
                if child.tag != "li":
                    continue
                item_content: list[dict[str, Any]] = []
                inline_content: list[dict[str, Any]] = []

                def flush_inline_content() -> None:
                    if inline_content:
                        item_content.append(create_paragraph_content(inline_content.copy(), f"{item_id}_p"))
                        inline_content.clear()

                item_id = next_block_id()
                # li 的直接文本位于 parts 中，不能只遍历 children，否则会丢失“<li>文本</li>”。
                for part in child.parts:
                    if isinstance(part, str):
                        text = _normalize_inline_text(part)
                        if text:
                            inline_content.append(create_text_node(text))
                    elif part.tag in {"ul", "ol"}:
                        flush_inline_content()
                        item_content.extend(convert_node(part))
                    else:
                        inline_content.extend(_inline_content(part))
                flush_inline_content()
                if item_content:
                    list_items.append(
                        {
                            "type": "listItem",
                            "attrs": {"blockId": item_id},
                            "content": item_content,
                        }
                    )
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
            image_node = _find_node(node, "img") or node
            src = _normalize_public_media_src(_extract_image_src(image_node))
            caption = ""
            for child in node.children:
                if child.tag == "figcaption" and child.text:
                    caption = child.text
                    break
            if src:
                image_id = _find_image_id_for_src(src)
                image_attrs: dict[str, Any] = {
                    "blockId": next_block_id(),
                    "src": src,
                    "alt": image_node.attrs.get("alt", ""),
                    "title": "",
                    "imageId": image_id,
                    "align": node.attrs.get("data-align") or image_node.attrs.get("data-align") or "center",
                }
                width = image_node.attrs.get("width", "").strip()
                if width.isdigit() and int(width) > 0:
                    image_attrs["width"] = int(width)
                items.append(
                    {
                        "type": "image",
                        "attrs": image_attrs,
                    }
                )
            caption_node = _create_caption_paragraph(caption, _find_link_href(node), next_block_id())
            if caption_node:
                items.append(caption_node)
            return items

        if node.tag == "table":
            rows: list[HtmlNode] = []

            def collect_rows(current: HtmlNode) -> None:
                for child in current.children:
                    if child.tag == "tr":
                        rows.append(child)
                    elif child.tag in {"thead", "tbody", "tfoot"}:
                        collect_rows(child)

            collect_rows(node)
            table_rows: list[dict[str, Any]] = []
            for row_index, row in enumerate(rows):
                cells: list[dict[str, Any]] = []
                row_has_header = any(child.tag == "th" for child in row.children)
                for cell in row.children:
                    if cell.tag not in {"td", "th"}:
                        continue
                    cell_content: list[dict[str, Any]] = []
                    inline_content = _inline_content(cell)
                    if inline_content:
                        cell_content.append(create_paragraph_content(inline_content, next_block_id()))
                    if not cell_content:
                        cell_content.append(create_paragraph_content([], next_block_id()))
                    cell_attrs: dict[str, Any] = {"colspan": 1, "rowspan": 1, "colwidth": None}
                    for attr_name in ("colspan", "rowspan"):
                        value = cell.attrs.get(attr_name, "").strip()
                        if value.isdigit() and int(value) > 0:
                            cell_attrs[attr_name] = int(value)
                    cell_type = "tableHeader" if cell.tag == "th" or (row_index == 0 and not row_has_header) else "tableCell"
                    cells.append({"type": cell_type, "attrs": cell_attrs, "content": cell_content})
                if cells:
                    table_rows.append({"type": "tableRow", "content": cells})
            if table_rows:
                items.append(
                    {
                        "type": "table",
                        "attrs": {"blockId": next_block_id()},
                        "content": table_rows,
                    }
                )
            return items

        if node.tag == "hr":
            items.append({"type": "horizontalRule"})
            return items

        if node.tag == "br":
            return items

        for child in node.children:
            items.extend(convert_node(child))

        if not items and node_text and node.tag in {"div", "section", "article", "main", "body"}:
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


def _render_inline_html(node: dict[str, Any]) -> str:
    if node.get("type") != "text":
        return ""
    value = escape_html(str(node.get("text", "")))
    for mark in node.get("marks", []) or []:
        mark_type = mark.get("type") if isinstance(mark, dict) else ""
        if mark_type == "bold":
            value = f"<strong>{value}</strong>"
        elif mark_type == "italic":
            value = f"<em>{value}</em>"
        elif mark_type == "underline":
            value = f"<u>{value}</u>"
        elif mark_type == "strike":
            value = f"<s>{value}</s>"
        elif mark_type == "highlight":
            value = f"<mark>{value}</mark>"
        elif mark_type == "code":
            value = f"<code>{value}</code>"
        elif mark_type == "link":
            attrs = mark.get("attrs") if isinstance(mark, dict) else {}
            href = escape_html(str((attrs or {}).get("href", "#")), quote=True)
            value = f'<a href="{href}" target="_blank" rel="noreferrer">{value}</a>'
    return value


def _render_tiptap_node(node: dict[str, Any]) -> str:
    node_type = node.get("type", "")
    if node_type == "text":
        return _render_inline_html(node)
    children = "".join(_render_tiptap_node(child) for child in node.get("content", []) or [])
    if node_type == "paragraph":
        return f"<p>{children}</p>"
    if node_type == "heading":
        level = int((node.get("attrs") or {}).get("level", 2))
        return f"<h{level}>{children}</h{level}>"
    if node_type == "bulletList":
        return "<ul>" + "".join(f"<li>{_render_tiptap_node(item)}</li>" for item in node.get("content", []) or []) + "</ul>"
    if node_type == "orderedList":
        return "<ol>" + "".join(f"<li>{_render_tiptap_node(item)}</li>" for item in node.get("content", []) or []) + "</ol>"
    if node_type == "listItem":
        return "".join(_render_tiptap_node(child) for child in node.get("content", []) or [])
    if node_type == "blockquote":
        return f"<blockquote>{children}</blockquote>"
    if node_type == "codeBlock":
        return f"<pre><code>{escape_html(''.join(child.get('text', '') for child in node.get('content', []) or []))}</code></pre>"
    if node_type == "table":
        return "<table><tbody>" + children + "</tbody></table>"
    if node_type == "tableRow":
        return f"<tr>{children}</tr>"
    if node_type == "tableCell":
        return _render_table_cell("td", node, children)
    if node_type == "tableHeader":
        return _render_table_cell("th", node, children)
    if node_type == "horizontalRule":
        return "<hr />"
    if node_type == "image":
        attrs = node.get("attrs") or {}
        src = escape_html(str(attrs.get("src", "")), quote=True)
        if not src:
            return ""
        alt = escape_html(str(attrs.get("alt", "")), quote=True)
        align = escape_html(str(attrs.get("align") or "center"), quote=True)
        image_attrs = [f'data-align="{align}"']
        width = attrs.get("width")
        if isinstance(width, (int, float)) and width > 0:
            width_value = int(width)
            image_attrs.insert(0, f'width="{width_value}"')
            image_attrs.append(f'style="width:{width_value}px;height:auto;max-width:100%;"')
        rendered_attrs = " ".join(image_attrs)
        return f'<figure data-align="{align}"><img src="{src}" alt="{alt}" {rendered_attrs} /></figure>'
    return children


def _render_table_cell(tag: str, node: dict[str, Any], children: str) -> str:
    """将 TipTap 表格单元格属性回写为 HTML，避免回填后丢失合并单元格。"""

    attrs = node.get("attrs") or {}
    html_attrs: list[str] = []
    for name in ("colspan", "rowspan"):
        value = attrs.get(name)
        if isinstance(value, int) and value > 1:
            html_attrs.append(f'{name}="{value}"')
    attributes = f" {' '.join(html_attrs)}" if html_attrs else ""
    return f"<{tag}{attributes}>{children}</{tag}>"


def render_tiptap_document(document: dict[str, Any]) -> str:
    return "".join(_render_tiptap_node(node) for node in document.get("content", []) or [])


def select_target_articles(slugs: list[str] | None = None) -> list[Article]:
    if slugs:
        return list(Article.objects.filter(slug__in=slugs).order_by("id"))
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
def backfill_articles(slugs: list[str] | None = None) -> dict[str, Any]:
    targets = select_target_articles(slugs)
    updated: list[dict[str, Any]] = []

    for article in targets:
        body_html = normalize_legacy_html(_normalize_html(article.body))
        content_html = normalize_legacy_html(_normalize_html(article.content_html)) or body_html
        if not slugs and _has_renderable_content_json(article.content_json) and not article_needs_rebuild(article):
            content_json = article.content_json
        else:
            content_json = build_tiptap_document_from_html(content_html)
        content_html = render_tiptap_document(content_json)
        body_html = content_html
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
    argument_parser = argparse.ArgumentParser(description="将文章 HTML 回填为可逆向编辑的 TipTap 文档")
    argument_parser.add_argument("--slugs", nargs="+", help="只处理指定 slug，避免影响其他文章")
    arguments = argument_parser.parse_args()
    result = backfill_articles(arguments.slugs)
    print(json.dumps(result, ensure_ascii=False, indent=2))
