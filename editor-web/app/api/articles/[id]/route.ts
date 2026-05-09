import { NextResponse } from "next/server";

import { getFoundationStatus } from "../../../../lib/foundation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const upstream = new URL(`/api/articles/${params.id}/`, getFoundationStatus().djangoBaseUrl);
  const response = await fetch(upstream, { cache: "no-store" });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const upstream = new URL(`/api/articles/${params.id}/`, getFoundationStatus().djangoBaseUrl);
  const response = await fetch(upstream, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: await request.text()
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
