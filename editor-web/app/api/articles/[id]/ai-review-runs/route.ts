import { NextResponse } from "next/server";

import { getFoundationStatus } from "../../../../../lib/foundation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const upstream = new URL(`/api/articles/${id}/ai-review-runs/`, getFoundationStatus().djangoBaseUrl);
  const response = await fetch(upstream, { cache: "no-store" });

  return NextResponse.json(await response.json(), { status: response.status });
}
