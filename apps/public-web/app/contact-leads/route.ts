import { NextResponse } from "next/server";

const djangoBaseUrl = (process.env.DJANGO_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_DJANGO_PUBLIC_BASE_URL || "http://127.0.0.1:9801").replace(/\/+$/, "");

export async function POST(request: Request) {
  const payload = await request.text();
  const forwardedFor = request.headers.get("x-forwarded-for");
  const response = await fetch(`${djangoBaseUrl}/api/public/leads/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
    body: payload,
    cache: "no-store",
  });
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
  });
}
