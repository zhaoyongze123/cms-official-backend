import { NextResponse } from "next/server";

import { getMockRunSuggestions } from "../../../../../lib/mock-api";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { runId } = await context.params;

  return NextResponse.json({
    run_id: runId,
    suggestions: getMockRunSuggestions(runId),
  });
}
