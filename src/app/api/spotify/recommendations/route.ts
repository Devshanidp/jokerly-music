import { auth } from "@/lib/auth";
import { getUserTopTracks, searchSpotify } from "@/lib/spotify";
import {
  fetchSimilarTracks,
  fetchUserTopTracksFallback,
  normalizeSimilarTrack,
  type SimilarTrack,
} from "@/lib/similar-tracks";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const GENRE_MAP: Record<string, string> = { "r&b": "r-n-b" };

function normalizeList(items: unknown[]): SimilarTrack[] {
  return items
    .map(normalizeSimilarTrack)
    .filter((t): t is SimilarTrack => !!t);
}

async function broadenFallback(
  accessToken: string,
  trackName: string,
  artistName: string,
  limit: number,
  existing: SimilarTrack[]
): Promise<SimilarTrack[]> {
  const seen = new Set(existing.map((t) => t.id));
  const out = [...existing];
  const primaryArtist = artistName.split(",")[0].trim();

  const queries = [
    primaryArtist,
    trackName,
    primaryArtist && trackName ? `${primaryArtist} ${trackName}` : "",
    "top hits",
  ].filter(Boolean);

  for (const q of queries) {
    if (out.length >= limit) break;
    try {
      const data = (await searchSpotify(q, "track", accessToken, 10)) as {
        tracks?: { items?: unknown[] };
      };
      for (const raw of data?.tracks?.items ?? []) {
        const track = normalizeSimilarTrack(raw);
        if (!track || seen.has(track.id)) continue;
        seen.add(track.id);
        out.push(track);
      }
    } catch {
      // try next query
    }
  }

  if (out.length < limit) {
    out.push(...(await fetchUserTopTracksFallback(accessToken, limit)));
  }

  return out.slice(0, limit);
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
  const trackName = searchParams.get("track");
  const artistName = searchParams.get("artist");
  const genre = searchParams.get("genre");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "15", 10) || 15, 1), 30);
  const excludeIds = (searchParams.get("exclude") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const refreshSeed = Math.max(0, parseInt(searchParams.get("refresh") ?? "0", 10) || 0);
  const token = session.accessToken as string;

  const json = (tracks: SimilarTrack[]) =>
    NextResponse.json(
      { tracks },
      {
        headers:
          tracks.length > 0
            ? { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" }
            : { "Cache-Control": "no-store" },
      }
    );

  try {
    if (trackName && artistName) {
      let tracks = await fetchSimilarTracks(token, {
        trackId,
        trackUri,
        trackName,
        artistName,
        limit,
        excludeIds,
        refreshSeed,
      });

      if (tracks.length < Math.min(5, limit)) {
        tracks = await broadenFallback(token, trackName, artistName, limit, tracks);
      }

      return json(tracks);
    }

    if (trackId) {
      let tracks = await fetchSimilarTracks(token, {
        trackId,
        trackUri,
        trackName: trackName ?? "",
        artistName: artistName ?? "",
        limit,
      });
      if (tracks.length < limit && artistName) {
        tracks = await broadenFallback(token, trackName ?? "", artistName, limit, tracks);
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
    return json(normalizeList(data.items ?? []));
  } catch (e) {
    console.error("[recommendations]", e);
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
