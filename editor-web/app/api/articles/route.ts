import { NextResponse } from "next/server";

import { createMockArticle, listMockArticles } from "../../../lib/mock-api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const items = listMockArticles({
    query: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status") ?? "all",
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const article = createMockArticle(body.title?.trim() || "未命名 Mock 草稿");

  return NextResponse.json(article, { status: 201 });
}
