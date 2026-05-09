import { NextResponse } from "next/server";

import { getFoundationStatus } from "../../../../../lib/foundation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const upstream = new URL(`/api/ai-suggestions/${id}/accept/`, getFoundationStatus().djangoBaseUrl);
  const response = await fetch(upstream, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: await request.text()
  });

  return NextResponse.json(await response.json(), { status: response.status });
}
