import { NextResponse } from "next/server";

import { getMockArticleAnalytics } from "../../../../../lib/mock-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const analytics = getMockArticleAnalytics(Number(id));

  if (!analytics) {
    return NextResponse.json({ error: { code: "not_found", message: "Mock 监控数据不存在。" } }, { status: 404 });
  }

  return NextResponse.json(analytics);
}
