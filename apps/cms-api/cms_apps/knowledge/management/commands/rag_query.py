import json

from django.core.management.base import BaseCommand

from cms_apps.knowledge.services import search_knowledge, serialize_chunks


class Command(BaseCommand):
    help = "执行 RAG 检索查询"

    def add_arguments(self, parser):
        parser.add_argument("query", help="检索查询词")
        parser.add_argument("--limit", type=int, default=5, help="返回分块数量")
        parser.add_argument("--source-type", default=None, help="按来源类型过滤")

    def handle(self, *args, **options):
        query = options["query"]
        limit = options["limit"]
        source_type = options["source_type"]
        chunks = search_knowledge(query=query, limit=limit, source_type=source_type)
        self.stdout.write(
            json.dumps(
                {
                    "rag_schema_version": "v1",
                    "query": query,
                    "chunks": serialize_chunks(chunks),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
