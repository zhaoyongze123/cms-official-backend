import { NextResponse } from "next/server";

import { listMockReviewRuns } from "../../../../../lib/mock-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  return NextResponse.json({
    article_id: Number(id),
    runs: listMockReviewRuns(Number(id)),
  });
}
