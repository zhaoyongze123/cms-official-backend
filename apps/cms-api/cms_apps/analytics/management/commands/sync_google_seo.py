import json

from django.core.management.base import BaseCommand, CommandError

from cms_apps.analytics.services.google_monitoring import (
    GoogleMonitoringConfigurationError,
    sync_crux,
    sync_ga4,
    sync_google_search_console,
    update_google_sync_status,
)


class Command(BaseCommand):
    help = "同步真实 Google SEO 监控数据，包括 GSC、GA4 与 CrUX。"

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7, help="GSC/GA4 拉取最近 N 天数据")
        parser.add_argument("--skip-gsc", action="store_true", help="跳过 Google Search Console")
        parser.add_argument("--skip-ga4", action="store_true", help="跳过 GA4 Data API")
        parser.add_argument("--skip-crux", action="store_true", help="跳过 CrUX API")

    def handle(self, *args, **options):
        days = options["days"]
        results = []
        try:
            if not options["skip_gsc"]:
                results.append(sync_google_search_console(days=days))
            if not options["skip_ga4"]:
                results.append(sync_ga4(days=days))
            if not options["skip_crux"]:
                results.append(sync_crux(days=1))
        except GoogleMonitoringConfigurationError as error:
            update_google_sync_status("failed", str(error))
            raise CommandError(str(error)) from error
        except Exception as error:
            update_google_sync_status("failed", str(error))
            raise

        payload = {"status": "ok", "days": days, "results": results}
        update_google_sync_status("ok", payload)
        self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))
