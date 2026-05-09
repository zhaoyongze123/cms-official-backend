import { NextResponse } from "next/server";

import { getFoundationStatus } from "../../../../../lib/foundation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const upstream = new URL(`/api/ai-suggestions/${id}/reject/`, getFoundationStatus().djangoBaseUrl);
  const response = await fetch(upstream, { method: "POST" });

  return NextResponse.json(await response.json(), { status: response.status });
}
