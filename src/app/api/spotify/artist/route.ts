import { auth } from "@/lib/auth";
import { getArtist, getArtistTopTracks, getRelatedArtists } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const [info, topTracksData, relatedData] = await Promise.all([
    getArtist(id, session.accessToken),
    getArtistTopTracks(id, session.accessToken),
    getRelatedArtists(id, session.accessToken),
  ]);

  return NextResponse.json({
    info,
    topTracks: topTracksData.tracks ?? [],
    related: (relatedData.artists ?? []).slice(0, 8),
  });
}
