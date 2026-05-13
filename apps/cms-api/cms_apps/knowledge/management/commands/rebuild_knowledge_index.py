import json

from django.core.management.base import BaseCommand, CommandError

from cms_apps.knowledge.services import rebuild_knowledge_index


class Command(BaseCommand):
    help = "重建知识索引"

    def add_arguments(self, parser):
        parser.add_argument("--source", default="article", help="来源类型，当前仅支持 article")
        parser.add_argument("--dry-run", action="store_true", help="只输出计划，不写入数据库")

    def handle(self, *args, **options):
        source = options["source"]
        dry_run = options["dry_run"]
        try:
            results = rebuild_knowledge_index(source=source, dry_run=dry_run)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(
            json.dumps(
                {
                    "source": source,
                    "dry_run": dry_run,
                    "indexed_count": len(results),
                    "results": results,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
