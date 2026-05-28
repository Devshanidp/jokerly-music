import { auth } from "@/lib/auth";
import { searchSpotify, SpotifyError } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await auth();
  } catch (e) {
    console.error("auth() failed in search:", e);
    return NextResponse.json({ error: "Auth error" }, { status: 401 });
  }
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session as { error?: string }).error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "Token expired, please re-login" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const type = searchParams.get("type") ?? "track";
  const rawLimit = parseInt(searchParams.get("limit") ?? "10", 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 10 : Math.min(rawLimit, 10);

  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  try {
    const token = session.accessToken as string;
    const data = await searchSpotify(q, type, token, limit);
    return NextResponse.json({
      tracks: data.tracks?.items ?? [],
      artists: data.artists?.items ?? [],
      albums: data.albums?.items ?? [],
    });
  } catch (e) {
    console.error("Spotify search error:", e);
    const status = e instanceof SpotifyError ? (e.status === 401 ? 401 : e.status === 429 ? 429 : 502) : 502;
    return NextResponse.json({ tracks: [], artists: [], albums: [], error: (e as Error).message }, { status });
  }
}
