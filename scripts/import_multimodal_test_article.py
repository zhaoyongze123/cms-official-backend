from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path

from django.core.files.base import ContentFile
from django.utils import timezone

from apps.media_library.models import ImageItem
from cms_apps.articles.models import Article, Category, Tag
from cms_apps.seo.models import SeoMetadata


BASE_DIR = Path("/app/scripts/import_payloads/multimodal_test_article")
ARTICLE_HTML_PATH = BASE_DIR / "article.html"
ARTICLE_SLUG = "multimodal-smart-recycling-pilot-observation"
ARTICLE_TITLE = "社区智能回收站试点四周观察：速度、准确率与居民参与度"
ARTICLE_SUMMARY = (
    "基于杭州市滨江区东门社区四周试点数据，复盘智能回收站在回收量增长、误投控制、"
    "居民参与度和运营异常处理上的真实表现，并用于多模态模型评测。"
)
ARTICLE_KEYWORDS = "多模态测试,智能回收站,OCR,图文理解,社区运营,异常工单,积分规则"
ARTICLE_TAGS = [
    "多模态测试",
    "智能回收站",
    "OCR",
    "图文理解",
    "社区运营",
    "异常工单",
    "积分规则",
]
ARTICLE_PUBLISH_AT = datetime(2026, 5, 11, 9, 0, 0)
CANONICAL_URL = f"http://127.0.0.1:3003/articles/{ARTICLE_SLUG}"


@dataclass
class HtmlNode:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    text_parts: list[str] = field(default_factory=list)
    children: list["HtmlNode"] = field(default_factory=list)

    @property
    def text(self) -> str:
        text = "".join(self.text_parts)
        return " ".join(text.split())


class BodyTreeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.capture_body = False
        self.stack: list[HtmlNode] = []
        self.root = HtmlNode(tag="body")
        self.void_tags = {"img", "br", "hr", "meta", "link", "input"}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "body":
            self.capture_body = True
            self.stack = [self.root]
            return
        if not self.capture_body:
            return

        node = HtmlNode(tag=tag, attrs={key: value or "" for key, value in attrs})
        self.stack[-1].children.append(node)
        if tag not in self.void_tags:
            self.stack.append(node)

    def handle_endtag(self, tag: str) -> None:
        if tag == "body":
            self.capture_body = False
            self.stack = []
            return
        if not self.capture_body or not self.stack:
            return
        if len(self.stack) > 1 and self.stack[-1].tag == tag:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        if not self.capture_body or not self.stack:
            return
        self.stack[-1].text_parts.append(data)


def create_text_node(text: str) -> dict[str, object]:
    return {"type": "text", "text": text}


def create_paragraph(text: str, block_id: str) -> dict[str, object]:
    return {
        "type": "paragraph",
        "attrs": {"blockId": block_id},
        "content": [create_text_node(text)],
    }


def create_heading(text: str, level: int, block_id: str) -> dict[str, object]:
    return {
        "type": "heading",
        "attrs": {"level": level, "blockId": block_id},
        "content": [create_text_node(text)],
    }


def create_list_item(text: str, block_id: str) -> dict[str, object]:
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


def extract_body_html(document_html: str) -> str:
    start = document_html.find("<body>")
    end = document_html.rfind("</body>")
    if start == -1 or end == -1:
        return document_html.strip()
    return document_html[start + len("<body>") : end].strip()


def upsert_media_images() -> tuple[dict[str, ImageItem], ImageItem]:
    image_map: dict[str, ImageItem] = {}
    cover_image: ImageItem | None = None

    for index in range(1, 5):
        filename = f"image_{index}.svg"
        source_path = BASE_DIR / filename
        title = f"{ARTICLE_TITLE}-配图{index}"
        alt_text = f"{ARTICLE_TITLE} 配图 {index}"
        image_item = ImageItem.objects.filter(title=title).first()
        content = source_path.read_bytes()

        if image_item is None:
            image_item = ImageItem.objects.create(title=title, alt_text=alt_text)
        else:
            image_item.alt_text = alt_text

        image_item.file.save(filename, ContentFile(content), save=False)
        image_item.save()
        image_map[filename] = image_item
        if index == 1:
            cover_image = image_item

    assert cover_image is not None
    return image_map, cover_image


def replace_image_sources(body_html: str, image_map: dict[str, ImageItem]) -> str:
    result = body_html
    for filename, image_item in image_map.items():
        result = result.replace(f'src="{filename}"', f'src="{image_item.file.url}"')
    return result


def build_tiptap_document(parser: BodyTreeParser, image_map: dict[str, ImageItem]) -> dict[str, object]:
    block_index = 1

    def next_block_id() -> str:
        nonlocal block_index
        value = f"blk_{block_index}"
        block_index += 1
        return value

    def convert_node(node: HtmlNode) -> list[dict[str, object]]:
        items: list[dict[str, object]] = []

        if node.tag == "h1":
            if node.text:
                items.append(create_heading(node.text, 1, next_block_id()))
            return items

        if node.tag == "h2":
            if node.text:
                items.append(create_heading(node.text, 2, next_block_id()))
            return items

        if node.tag == "p":
            if node.text:
                items.append(create_paragraph(node.text, next_block_id()))
            return items

        if node.tag == "figure":
            image_child = next((child for child in node.children if child.tag == "img"), None)
            caption_child = next((child for child in node.children if child.tag == "figcaption"), None)
            if image_child is not None:
                src_name = Path(image_child.attrs.get("src", "")).name
                image_item = image_map.get(src_name)
                image_node: dict[str, object] = {
                    "type": "image",
                    "attrs": {
                        "blockId": next_block_id(),
                        "src": image_item.file.url if image_item else image_child.attrs.get("src", ""),
                        "alt": image_item.alt_text if image_item else image_child.attrs.get("alt", ""),
                        "title": caption_child.text if caption_child and caption_child.text else "",
                        "imageId": image_item.id if image_item else None,
                    },
                }
                items.append(image_node)
            if caption_child and caption_child.text:
                items.append(create_paragraph(caption_child.text, next_block_id()))
            return items

        if node.tag == "ul":
            list_items = []
            for child in node.children:
                if child.tag == "li" and child.text:
                    list_items.append(create_list_item(child.text, next_block_id()))
            if list_items:
                items.append({"type": "bulletList", "attrs": {"blockId": next_block_id()}, "content": list_items})
            return items

        if node.tag == "ol":
            list_items = []
            for child in node.children:
                if child.tag == "li" and child.text:
                    list_items.append(create_list_item(child.text, next_block_id()))
            if list_items:
                items.append({"type": "orderedList", "attrs": {"blockId": next_block_id()}, "content": list_items})
            return items

        if node.tag == "div":
            for child in node.children:
                items.extend(convert_node(child))
            return items

        for child in node.children:
            items.extend(convert_node(child))
        return items

    content: list[dict[str, object]] = []
    for child in parser.root.children:
        content.extend(convert_node(child))
    return {"type": "doc", "content": content}


def resolve_category() -> Category:
    category = Category.objects.filter(slug="ai-verify").first()
    if category is not None:
        return category
    category = Category.objects.filter(name="AI验证").first()
    if category is not None:
        return category
    return Category.objects.create(
        name="AI验证",
        slug="ai-verify",
        seo_title="AI验证",
        seo_keywords="AI验证,多模态测试",
        seo_description="AI 验证与多模态测试文章分类。",
    )


def resolve_tags() -> list[Tag]:
    tags: list[Tag] = []
    for name in ARTICLE_TAGS:
        tag = Tag.objects.filter(name=name).first()
        if tag is None:
            tag = Tag.objects.create(name=name, slug=name)
        tags.append(tag)
    return tags


def main() -> None:
    if not ARTICLE_HTML_PATH.exists():
        raise FileNotFoundError(f"未找到文章源文件: {ARTICLE_HTML_PATH}")

    source_html = ARTICLE_HTML_PATH.read_text(encoding="utf-8")
    body_html = extract_body_html(source_html)
    image_map, cover_image = upsert_media_images()
    body_html = replace_image_sources(body_html, image_map)

    parser = BodyTreeParser()
    parser.feed(source_html)
    content_json = build_tiptap_document(parser, image_map)

    category = resolve_category()
    tags = resolve_tags()
    publish_at = timezone.make_aware(ARTICLE_PUBLISH_AT, timezone.get_current_timezone())

    article, created = Article.objects.get_or_create(
        slug=ARTICLE_SLUG,
        defaults={
            "title": ARTICLE_TITLE,
            "body": body_html,
            "content_json": content_json,
            "content_html": body_html,
            "status": "published",
            "publish_date": publish_at,
            "meta_description": ARTICLE_SUMMARY,
            "category": category,
            "cover_image": cover_image,
        },
    )

    article.title = ARTICLE_TITLE
    article.category = category
    article.cover_image = cover_image
    article.body = body_html
    article.content_json = content_json
    article.content_html = body_html
    article.status = "published"
    article.publish_date = publish_at
    article.meta_description = ARTICLE_SUMMARY
    article.save()
    article.tags.set(tags)

    seo_metadata, _ = SeoMetadata.objects.update_or_create(
        article=article,
        defaults={
            "meta_title": ARTICLE_TITLE,
            "meta_description": ARTICLE_SUMMARY,
            "meta_keywords": ARTICLE_KEYWORDS,
            "canonical_url": CANONICAL_URL,
            "robots": "index,follow",
            "og_title": ARTICLE_TITLE,
            "og_description": ARTICLE_SUMMARY,
            "og_image": cover_image,
        },
    )

    result = {
        "created": created,
        "article_id": article.id,
        "title": article.title,
        "slug": article.slug,
        "status": article.status,
        "category": {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
        },
        "tag_names": [tag.name for tag in tags],
        "cover_image_id": cover_image.id,
        "seo_id": seo_metadata.id,
        "canonical_url": seo_metadata.canonical_url,
        "content_block_count": len(content_json.get("content", [])),
        "image_urls": {key: value.file.url for key, value in image_map.items()},
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


main()
