import { NextResponse } from "next/server";

import { createMockArticle, listMockArticles } from "../../../lib/mock-api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "all";

  return NextResponse.json({
    items: listMockArticles({
      query,
      status
    })
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
  };

  const article = createMockArticle(body.title ?? "未命名 Mock 文章");

  return NextResponse.json(article, {
    status: 201
  });
}
