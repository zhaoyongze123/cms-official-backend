#!/usr/bin/env python
"""Django 管理入口，指向 apps/cms-api 作为工程根目录。"""

import os
import sys
from pathlib import Path


def main():
    """执行管理命令。"""
    current_dir = Path(__file__).resolve().parent
    repo_root = current_dir.parents[1]
    if str(current_dir) not in sys.path:
        sys.path.insert(0, str(current_dir))
    if str(repo_root) not in sys.path:
        sys.path.insert(1, str(repo_root))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "无法导入 Django，请确认依赖已安装且虚拟环境已激活。"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
