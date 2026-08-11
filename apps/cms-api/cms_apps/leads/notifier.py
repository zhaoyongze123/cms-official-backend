"""官网线索邮件通知轮询进程。"""

from __future__ import annotations

import os
import time

import django


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    django.setup()
    from cms_apps.leads.services import process_pending_deliveries

    interval = int(os.getenv("LEAD_NOTIFICATION_POLL_SECONDS", "60"))
    while True:
        try:
            process_pending_deliveries()
        except Exception as exc:  # pragma: no cover - 依赖数据库和邮件服务的运行时保护
            print(f"[lead-notifier] {exc}", flush=True)
        time.sleep(interval)


if __name__ == "__main__":
    main()
