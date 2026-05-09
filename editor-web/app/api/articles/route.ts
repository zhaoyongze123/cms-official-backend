import { NextResponse } from "next/server";

import { getFoundationStatus } from "../../../lib/foundation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const upstream = new URL("/api/articles/", getFoundationStatus().djangoBaseUrl);
  upstream.search = url.search;
  const response = await fetch(upstream, { cache: "no-store" });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function POST(request: Request) {
  const upstream = new URL("/api/articles/", getFoundationStatus().djangoBaseUrl);
  const body = await request.text();
  const response = await fetch(upstream, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
