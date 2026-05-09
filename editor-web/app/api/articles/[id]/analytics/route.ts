import { NextResponse } from "next/server";

import { getMockArticleAnalytics } from "../../../../../lib/mock-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const articleId = Number(id);
  const payload = getMockArticleAnalytics(articleId);

  if (!Number.isFinite(articleId) || payload === null) {
    return NextResponse.json(
      {
        error: {
          code: "article_not_found",
          message: "文章监控数据不存在"
        }
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.json(payload);
}
