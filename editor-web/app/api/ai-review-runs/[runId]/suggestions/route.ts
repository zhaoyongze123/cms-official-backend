import { NextResponse } from "next/server";

import { getFoundationStatus } from "../../../../../lib/foundation";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { runId } = await context.params;
  const upstream = new URL(`/api/ai-review-runs/${runId}/suggestions/`, getFoundationStatus().djangoBaseUrl);
  const response = await fetch(upstream, { cache: "no-store" });

  return NextResponse.json(await response.json(), { status: response.status });
}
