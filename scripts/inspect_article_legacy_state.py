from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import django


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


def main() -> None:
    article_id = int(os.environ.get("ARTICLE_ID", "19"))
    article = Article.objects.get(id=article_id)
    content = (article.content_json or {}).get("content", [])
    first_paragraphs: list[str] = []
    first_images: list[dict[str, object]] = []
    for block in content:
        if block.get("type") == "paragraph" and len(first_paragraphs) < 5:
            text = "".join(
                part.get("text", "")
                for part in block.get("content", [])
                if isinstance(part, dict)
            )
            first_paragraphs.append(repr(text))
        if block.get("type") == "image" and len(first_images) < 5:
            first_images.append(block.get("attrs", {}))
    print(
        json.dumps(
            {
                "article_id": article.id,
                "body_prefix_repr": repr((article.body or "")[:400]),
                "content_html_prefix_repr": repr((article.content_html or "")[:400]),
                "first_paragraphs_repr": first_paragraphs,
                "first_images": first_images,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
