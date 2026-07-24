import { getApiSession, unauthorized } from "@/lib/api-auth";
import { listYTLibraryPlaylists } from "@/lib/youtubeMusic";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as { cookieString?: string };
  const cookieString = String(body.cookieString ?? "").trim();
  if (!cookieString) {
    return NextResponse.json({ error: "Cookie string is required" }, { status: 400 });
  }

  try {
    const items = await listYTLibraryPlaylists(cookieString);
    return NextResponse.json({ items });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[YouTube Music playlists]", errorMessage);
    if (errorMessage.includes("401") || /auth|unauthor/i.test(errorMessage)) {
      return NextResponse.json(
        {
          error:
            "Authentication failed: paste the full Cookie header from music.youtube.com (DevTools → Network → Cookie)",
        },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
