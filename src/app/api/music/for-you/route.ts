import { getApiSessionWithToken } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { getArtistTopTracks, searchCatalog } from "@/lib/music-api";
import { normalizeSimilarTrack } from "@/lib/similar-tracks";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

async function topTracksForArtist(artistId: string, accessToken: string) {
  try {
    const data = (await getArtistTopTracks(artistId, accessToken)) as { tracks?: unknown[] };
    return Array.isArray(data?.tracks) ? data.tracks : [];
  } catch {
    // Fallback: search by artist id often fails; try nothing here
    return [];
  }
}

export async function GET(req: NextRequest) {
  const session = await getApiSessionWithToken();
  if (!session) return NextResponse.json({ tracks: [] });

  const { searchParams } = new URL(req.url);
  const requestedArtistIds = (searchParams.get("artists") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  let likedIds: string[] = [];
  try {
    const supabase = await createClient();
    const { data: likedArtists } = await supabase
      .from("liked_artists")
      .select("artist_id")
      .eq("user_id", session.userId)
      .order("liked_at", { ascending: false })
      .limit(10);
    likedIds = (likedArtists ?? [])
      .map((a: { artist_id: string }) => a.artist_id)
      .filter(Boolean);
  } catch {
    /* prefs-only seeds still work */
  }

  const seeds = [...new Set([...requestedArtistIds, ...likedIds])].slice(0, 6);
  if (!seeds.length) return NextResponse.json({ tracks: [] });

  const token = session.accessToken;
  const seen = new Set<string>();
  const tracks: ReturnType<typeof normalizeSimilarTrack>[] = [];

  const batches = await Promise.all(
    seeds.map(async (artistId) => {
      const rawTracks = await topTracksForArtist(artistId, token);
      return rawTracks;
    })
  );

  for (const batch of batches) {
    for (const raw of batch) {
      const track = normalizeSimilarTrack(raw);
      if (!track || seen.has(track.id)) continue;
      seen.add(track.id);
      tracks.push(track);
      if (tracks.length >= 24) break;
    }
    if (tracks.length >= 24) break;
  }

  // Last-resort fill from catalog search if top-tracks returned nothing
  if (tracks.length === 0 && requestedArtistIds.length > 0) {
    try {
      const q = requestedArtistIds.slice(0, 2).join(" OR ");
      const data = (await searchCatalog(q, "track", token, 20)) as {
        tracks?: { items?: unknown[] };
      };
      for (const raw of data?.tracks?.items ?? []) {
        const track = normalizeSimilarTrack(raw);
        if (!track || seen.has(track.id)) continue;
        seen.add(track.id);
        tracks.push(track);
        if (tracks.length >= 20) break;
      }
    } catch {
      /* keep empty */
    }
  }

  return NextResponse.json(
    { tracks },
    { headers: { "Cache-Control": "private, max-age=120, stale-while-revalidate=60" } }
  );
}
