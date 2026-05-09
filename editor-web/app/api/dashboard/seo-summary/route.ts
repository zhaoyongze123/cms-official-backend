import { NextResponse } from "next/server";

import { getFoundationStatus } from "../../../../lib/foundation";

export async function GET() {
  const upstream = new URL("/api/dashboard/seo-summary/", getFoundationStatus().djangoBaseUrl);
  const response = await fetch(upstream, { cache: "no-store" });
  return NextResponse.json(await response.json(), { status: response.status });
}
