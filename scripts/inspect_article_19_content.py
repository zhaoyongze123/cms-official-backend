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
from scripts.backfill_article_editor_content import article_needs_rebuild


def main() -> None:
    article = Article.objects.get(id=19)
    content = (article.content_json or {}).get("content", [])
    rows: list[str] = []
    for node in content:
        if node.get("type") != "paragraph":
            continue
        texts = [part.get("text", "") for part in node.get("content", []) if isinstance(part, dict)]
        joined = "".join(texts)
        if (not joined.strip()) or ("\n" in joined):
            rows.append(joined)

    print(
        json.dumps(
            {
                "needs_rebuild": article_needs_rebuild(article),
                "block_count": len(content),
                "newline_or_blank_count": len(rows),
                "examples": rows[:10],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
