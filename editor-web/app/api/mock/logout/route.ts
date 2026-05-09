import { NextResponse } from "next/server";

import { MOCK_SESSION_COOKIE } from "../../../../lib/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(MOCK_SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 0
  });
  return response;
}
