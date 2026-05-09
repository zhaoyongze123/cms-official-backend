import { NextResponse } from "next/server";

import { acceptMockSuggestion } from "../../../../../lib/mock-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => ({}));
  const result = acceptMockSuggestion(id, payload);

  if (!result) {
    return NextResponse.json({ error: { code: "not_found", message: "Mock 建议不存在。" } }, { status: 404 });
  }

  return NextResponse.json(result);
}
