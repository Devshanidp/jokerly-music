import { auth } from "@/lib/auth";
import { getUserTopTracks, searchSpotify } from "@/lib/spotify";
import {
  fetchSimilarTracks,
  fetchSimilarTracksFallback,
  normalizeSimilarTrack,
  type SimilarTrack,
} from "@/lib/similar-tracks";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const GENRE_MAP: Record<string, string> = { "r&b": "r-n-b" };
const MAX_EXCLUDE_IDS = 80;

function normalizeList(items: unknown[]): SimilarTrack[] {
  return items.map(normalizeSimilarTrack).filter((t): t is SimilarTrack => !!t);
}

function json(tracks: SimilarTrack[]) {
  return NextResponse.json(
    { tracks },
    {
      headers:
        tracks.length > 0
          ? { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" }
          : { "Cache-Control": "no-store" },
    }
  );
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session as { error?: string }).error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "Token expired, please re-login" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get("trackId");
  const trackUri = searchParams.get("trackUri");
  const trackName = searchParams.get("track") ?? "";
  const artistName = searchParams.get("artist") ?? "";
  const genre = searchParams.get("genre");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "15", 10) || 15, 1), 30);
  const excludeIds = (searchParams.get("exclude") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(-MAX_EXCLUDE_IDS);
  const refreshSeed = Math.max(0, parseInt(searchParams.get("refresh") ?? "0", 10) || 0);
  const token = session.accessToken as string;

  try {
    if (trackName.trim() && artistName.trim()) {
      let tracks = await fetchSimilarTracksFallback(
        token,
        trackName,
        artistName,
        limit,
        refreshSeed
      );

      if (tracks.length < limit) {
        tracks = await fetchSimilarTracks(token, {
          trackId,
          trackUri,
          trackName,
          artistName,
          limit,
          excludeIds,
          refreshSeed,
        });
      }

      if (tracks.length < limit) {
        tracks = await fetchSimilarTracksFallback(
          token,
          trackName,
          artistName,
          limit,
          refreshSeed + 1,
          tracks
        );
      }

      return json(tracks);
    }

    if (trackId) {
      let tracks = await fetchSimilarTracks(token, {
        trackId,
        trackUri,
        trackName,
        artistName,
        limit,
        excludeIds,
        refreshSeed,
      });

      if (tracks.length < limit && artistName.trim()) {
        tracks = await fetchSimilarTracksFallback(
          token,
          trackName,
          artistName,
          limit,
          refreshSeed,
          tracks
        );
      }

      return json(tracks);
    }

    if (genre) {
      const seed = GENRE_MAP[genre] ?? genre;
      const data = (await searchSpotify(`genre:${seed}`, "track", token, limit)) as {
        tracks?: { items?: unknown[] };
      };
      return json(normalizeList(data.tracks?.items ?? []));
    }

    const data = await getUserTopTracks(token, limit);
    return json(normalizeList((data as { items?: unknown[] }).items ?? []));
  } catch (e) {
    console.error("[recommendations]", e);
    if (trackName.trim() && artistName.trim()) {
      try {
        const tracks = await fetchSimilarTracksFallback(
          token,
          trackName,
          artistName,
          limit,
          refreshSeed
        );
        if (tracks.length > 0) return json(tracks);
      } catch {
        // fall through
      }
    }
    try {
      const data = (await searchSpotify("top", "track", token, limit)) as {
        tracks?: { items?: unknown[] };
      };
      const tracks = normalizeList(data.tracks?.items ?? []);
      if (tracks.length > 0) return json(tracks);
    } catch {
      // fall through
    }
    return NextResponse.json({ tracks: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
