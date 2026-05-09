import { NextResponse } from "next/server";

import { getMockArticleById, updateMockArticle } from "../../../../lib/mock-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const article = getMockArticleById(Number(params.id));

  if (!article) {
    return NextResponse.json({ error: { code: "not_found", message: "Mock 文章不存在。" } }, { status: 404 });
  }

  return NextResponse.json(article);
}

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const payload = await request.json().catch(() => ({}));
  const article = updateMockArticle(Number(params.id), payload);

  if (!article) {
    return NextResponse.json({ error: { code: "not_found", message: "Mock 文章不存在。" } }, { status: 404 });
  }

  return NextResponse.json(article);
}
