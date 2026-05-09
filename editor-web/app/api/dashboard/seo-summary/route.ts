import { NextResponse } from "next/server";

import { getMockSeoSummary } from "../../../../lib/mock-api";

export async function GET() {
  return NextResponse.json(getMockSeoSummary());
}
