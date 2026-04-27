import { auth } from "@/lib/auth";
import { searchSpotify } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const type = searchParams.get("type") ?? "track";
  const limit = Number(searchParams.get("limit") ?? "20");

  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const data = await searchSpotify(q, type, session.accessToken, limit);

  return NextResponse.json({
    tracks: data.tracks?.items ?? [],
    artists: data.artists?.items ?? [],
    albums: data.albums?.items ?? [],
  });
}
