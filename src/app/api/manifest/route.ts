import { NextResponse } from "next/server";

// Redirect to the static manifest so CDN cache of this route
// always resolves to the up-to-date public/manifest.json
export function GET() {
  return NextResponse.redirect(
    new URL("/manifest.json", "https://jokerly-music.vercel.app"),
    { status: 301, headers: { "Cache-Control": "no-store" } }
  );
}
