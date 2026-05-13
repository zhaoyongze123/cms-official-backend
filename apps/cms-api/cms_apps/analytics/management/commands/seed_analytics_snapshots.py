import json

from django.core.management.base import BaseCommand

from cms_apps.analytics.services import seed_analytics_snapshots


class Command(BaseCommand):
    help = "为本地开发环境写入文章 AnalyticsSnapshot 快照"

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7, help="为每篇文章生成最近 N 天快照")
        parser.add_argument("--source", default="gsc_ga4_stub", help="写入的快照来源标识")
        parser.add_argument("--include-drafts", action="store_true", help="是否同时为草稿文章生成快照")

    def handle(self, *args, **options):
        days = options["days"]
        source = options["source"]
        include_drafts = options["include_drafts"]

        results = seed_analytics_snapshots(
            days=days,
            source=source,
            include_drafts=include_drafts,
        )
        self.stdout.write(
            json.dumps(
                {
                    "days": days,
                    "source": source,
                    "include_drafts": include_drafts,
                    "article_count": len(results),
                    "results": results,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
