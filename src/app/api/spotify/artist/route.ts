import { auth } from "@/lib/auth";
import { getArtist, getArtistTopTracks, getRelatedArtists } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Fetch artist info first so we can pass genres to the related-artists search
  const info = await getArtist(id, session.accessToken).catch((e) => {
    console.error("getArtist failed:", e);
    return null;
  });

  if (!info) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  // Now fetch top tracks + related in parallel using artist metadata
  const [topTracksData, relatedData] = await Promise.all([
    getArtistTopTracks(id, session.accessToken).catch((e) => {
      console.error("getArtistTopTracks failed:", e);
      return { tracks: [] };
    }),
    getRelatedArtists(id, session.accessToken, info.genres ?? [], info.name ?? "").catch(() => ({
      artists: [],
    })),
  ]);

  return NextResponse.json({
    info,
    topTracks: topTracksData.tracks ?? [],
    related: (relatedData.artists ?? []).slice(0, 8),
  });
}
