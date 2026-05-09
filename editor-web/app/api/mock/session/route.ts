import { NextResponse } from "next/server";

import { MOCK_SESSION_COOKIE } from "../../../../lib/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/studio/articles", request.url));
  response.cookies.set(MOCK_SESSION_COOKIE, "authenticated", {
    httpOnly: true,
    path: "/",
    sameSite: "lax"
  });
  return response;
}
