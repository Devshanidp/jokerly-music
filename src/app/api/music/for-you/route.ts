import { getApiSessionWithToken } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { getArtistTopTracks } from "@/lib/music-api";
import { normalizeSimilarTrack } from "@/lib/similar-tracks";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await getApiSessionWithToken();
  if (!session) return NextResponse.json({ tracks: [] });

  const { searchParams } = new URL(req.url);
  const requestedArtistIds = (searchParams.get("artists") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  const supabase = await createClient();
  const { data: likedArtists } = await supabase
    .from("liked_artists")
    .select("artist_id")
    .eq("user_id", session.userId)
    .order("liked_at", { ascending: false })
    .limit(10);

  const seeds = [
    ...new Set([
      ...requestedArtistIds,
      ...((likedArtists ?? []).map((a: { artist_id: string }) => a.artist_id).filter(Boolean)),
    ]),
  ].slice(0, 5);

  if (!seeds.length) return NextResponse.json({ tracks: [] });

  const token = session.accessToken;
  const seen = new Set<string>();
  const tracks: ReturnType<typeof normalizeSimilarTrack>[] = [];

  for (const artistId of seeds) {
    if (tracks.length >= 20) break;
    try {
      const data = (await getArtistTopTracks(artistId, token)) as { tracks?: unknown[] };
      for (const raw of data?.tracks ?? []) {
        const track = normalizeSimilarTrack(raw);
        if (!track || seen.has(track.id)) continue;
        seen.add(track.id);
        tracks.push(track);
        if (tracks.length >= 20) break;
      }
    } catch {
      // try next seed artist
    }
  }

  return NextResponse.json(
    { tracks },
    { headers: { "Cache-Control": "private, max-age=180, stale-while-revalidate=60" } }
  );
}
