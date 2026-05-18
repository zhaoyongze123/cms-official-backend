from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import django
from django.db import transaction
from django.utils.text import slugify


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

from cms_apps.articles.models import Article, Category, Tag


ARTICLE_MAPPINGS = [
    {
        "article_id": 13,
        "category": "邮件应用方案",
        "tags": [],
    },
    {
        "article_id": 14,
        "category": "通用解决方案",
        "tags": [],
    },
    {
        "article_id": 15,
        "category": "通用解决方案",
        "tags": [],
    },
    {
        "article_id": 16,
        "category": "通用解决方案",
        "tags": [],
    },
    {
        "article_id": 17,
        "category": "人工智能方案",
        "tags": [],
    },
    {
        "article_id": 18,
        "category": "人工智能方案",
        "tags": [],
    },
    {
        "article_id": 19,
        "category": "通用解决方案",
        "tags": [],
    },
    {
        "article_id": 20,
        "category": "通用解决方案",
        "tags": [],
    },
    {
        "article_id": 12,
        "category": "邮件应用方案",
        "tags": ["邮件归档", "邮件审计", "邮件合规性"],
    },
]


def ensure_category(name: str) -> Category:
    category = Category.objects.filter(name=name).first()
    if category is not None:
        return category

    base_slug = slugify(name, allow_unicode=True) or "category"
    slug = base_slug
    index = 1
    while Category.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{index}"
        index += 1
    return Category.objects.create(name=name, slug=slug)


def ensure_tag(name: str) -> Tag:
    tag = Tag.objects.filter(name=name).first()
    if tag is not None:
        return tag

    base_slug = slugify(name, allow_unicode=True) or "tag"
    slug = base_slug
    index = 1
    while Tag.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{index}"
        index += 1
    return Tag.objects.create(name=name, slug=slug)


@transaction.atomic
def run() -> dict[str, object]:
    updated_articles: list[dict[str, object]] = []

    for mapping in ARTICLE_MAPPINGS:
        article = Article.objects.get(id=mapping["article_id"])
        category = ensure_category(mapping["category"])
        article.category = category
        article.save(update_fields=["category"])

        tags = [ensure_tag(name) for name in mapping["tags"]]
        article.tags.set(tags)
        updated_articles.append(
            {
                "article_id": article.id,
                "title": article.title,
                "category": category.name,
                "tags": [tag.name for tag in tags],
            }
        )

    return {"updated_count": len(updated_articles), "items": updated_articles}


if __name__ == "__main__":
    print(json.dumps(run(), ensure_ascii=False, indent=2))
