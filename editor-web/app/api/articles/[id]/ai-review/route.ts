import { NextResponse } from "next/server";

import { triggerMockAiReview } from "../../../../../lib/mock-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = triggerMockAiReview(Number(id));

  if (!result) {
    return NextResponse.json({ error: { code: "not_found", message: "Mock 文章不存在。" } }, { status: 404 });
  }

  return NextResponse.json(result, { status: 202 });
}
