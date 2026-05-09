import { NextResponse } from "next/server";

import { getMockArticleById, updateMockArticlePayload } from "../../../../lib/mock-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const articleId = Number(params.id);
  const article = getMockArticleById(articleId);

  if (!article) {
    return NextResponse.json(
      {
        error: {
          code: "article_not_found",
          message: "未找到对应的 Mock 文章。"
        }
      },
      { status: 404 }
    );
  }

  return NextResponse.json(article);
}

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const articleId = Number(params.id);
  const article = getMockArticleById(articleId);

  if (!article) {
    return NextResponse.json(
      {
        error: {
          code: "article_not_found",
          message: "未找到对应的 Mock 文章。"
        }
      },
      { status: 404 }
    );
  }

  const payload = await request.json();
  return NextResponse.json(updateMockArticlePayload(article, payload));
}
