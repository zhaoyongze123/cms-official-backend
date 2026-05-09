import { NextResponse } from "next/server";

import { rejectMockSuggestion } from "../../../../../lib/mock-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const suggestion = rejectMockSuggestion(id);

  if (!suggestion) {
    return NextResponse.json({ error: { code: "not_found", message: "Mock 建议不存在。" } }, { status: 404 });
  }

  return NextResponse.json({ suggestion });
}
