import { NextRequest, NextResponse } from "next/server";
import { GUEST_COOKIE } from "@/lib/guest";

/** Start a browse-only guest session and open the app. */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
  response.cookies.set(GUEST_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    httpOnly: true,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
