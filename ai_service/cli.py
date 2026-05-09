from __future__ import annotations

import argparse
import json
from typing import Any

from ai_service.core.models import build_trace_id
from ai_service.core.providers import get_provider


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="AI 服务 RAG 命令")
    subparsers = parser.add_subparsers(dest="command", required=True)

    search_parser = subparsers.add_parser("search", help="执行 RAG 检索")
    search_parser.add_argument("--query", required=True, help="检索查询")
    search_parser.add_argument("--limit", type=int, default=5, help="返回条数")

    reindex_parser = subparsers.add_parser("reindex", help="重建文章索引")
    reindex_parser.add_argument("--article-id", type=int, required=True, help="文章 ID")
    reindex_parser.add_argument("--title", default="", help="文章标题")
    reindex_parser.add_argument("--summary", default="", help="文章摘要")
    reindex_parser.add_argument("--content", default="", help="文章正文")
    reindex_parser.add_argument("--url", default="", help="文章地址")

    return parser


def _print_json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    provider = get_provider()
    trace_id = build_trace_id()

    if args.command == "search":
        response = provider.search_rag(payload={"query": args.query, "limit": args.limit}, trace_id=trace_id)
        _print_json(response.to_dict())
        return 0

    if args.command == "reindex":
        payload = {
            "title": args.title,
            "summary": args.summary,
            "content": args.content,
            "url": args.url,
        }
        result = provider.reindex_article(article_id=args.article_id, payload=payload, trace_id=trace_id)
        _print_json(result)
        return 0

    parser.error("不支持的命令")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
