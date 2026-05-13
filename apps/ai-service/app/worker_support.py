from __future__ import annotations

import os
import sys
from pathlib import Path


def setup_django() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    cms_api_root = repo_root / "apps" / "cms-api"
    for path in (str(cms_api_root), str(repo_root)):
        if path not in sys.path:
            sys.path.insert(0, path)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

    import django

    django.setup()
