import { getApiSessionWithToken, unauthorized } from "@/lib/api-auth";
import {
  buildMixSubtitle,
  clusterByMixIndex,
  DAILY_MIX_COUNT,
  DAILY_MIX_TRACKS,
  getDayKey,
  seededShuffle,
  type DailyMixPayload,
  secondsUntilUtcDayEnd,
} from "@/lib/daily-mix";
import { getArtistTopTracks, getRecommendations, getUserTopTracks } from "@/lib/music-api";
import { normalizeSimilarTrack, type SimilarTrack } from "@/lib/similar-tracks";
import { createClient } from "@/lib/supabase/server";
import { trackIdFromUri } from "@/lib/track-uri";
import { NextResponse } from "next/server";

export const maxDuration = 60;

type SeedArtist = { id: string; name: string; score: number };
type SeedTrack = { id: string; uri: string; name: string; artist: string; image: string | null };

const mixCache = new Map<string, { mixes: DailyMixPayload[]; expires: number }>();

function compactTracks(items: unknown[]): SimilarTrack[] {
  return items.map(normalizeSimilarTrack).filter((track): track is SimilarTrack => !!track);
}

function addTrack(
  target: SimilarTrack[],
  seen: Set<string>,
  track: SimilarTrack | null,
  limit: number
) {
  if (!track || seen.has(track.id) || target.length >= limit) return;
  seen.add(track.id);
  target.push(track);
}

async function loadUserSignals(userId: string) {
  const supabase = await createClient();
  const [recentRes, likedSongsRes, likedArtistsRes] = await Promise.all([
    supabase
      .from("recently_played")
      .select("track_uri, track_name, track_artist, track_image")
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(25),
    supabase
      .from("liked_songs")
      .select("track_uri, track_name, track_artist, track_image")
      .eq("user_id", userId)
      .order("liked_at", { ascending: false })
      .limit(40),
    supabase
      .from("liked_artists")
      .select("artist_id, artist_name")
      .eq("user_id", userId)
      .order("liked_at", { ascending: false })
      .limit(20),
  ]);

  const artistScores = new Map<string, SeedArtist>();
  const bumpArtist = (id: string, name: string, score: number) => {
    const key = id || name.toLowerCase();
    const existing = artistScores.get(key);
    if (existing) {
      existing.score += score;
      return;
    }
    artistScores.set(key, { id, name, score });
  };

  for (const row of likedArtistsRes.data ?? []) {
    if (!row.artist_id || !row.artist_name) continue;
    bumpArtist(row.artist_id, row.artist_name, 4);
  }

  const tracks: SeedTrack[] = [];
  const pushTrack = (uri: string, name: string, artist: string, image: string | null, weight: number) => {
    const id = trackIdFromUri(uri);
    if (!id || !name.trim()) return;
    tracks.push({ id, uri, name, artist, image });
    for (const part of artist.split(",").map((s) => s.trim()).filter(Boolean)) {
      bumpArtist("", part, weight);
    }
  };

  for (const row of recentRes.data ?? []) {
    pushTrack(row.track_uri, row.track_name, row.track_artist, row.track_image ?? null, 3);
  }
  for (const row of likedSongsRes.data ?? []) {
    pushTrack(row.track_uri, row.track_name, row.track_artist, row.track_image ?? null, 2);
  }

  const artists = [...artistScores.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const knownArtistIds = new Set(
    artists.map((artist) => artist.id).filter((id) => id.length > 0)
  );
  for (const artist of artists) {
    if (artist.id) continue;
    const match = (likedArtistsRes.data ?? []).find(
      (row) => row.artist_name?.toLowerCase() === artist.name.toLowerCase()
    );
    if (match?.artist_id) {
      artist.id = match.artist_id;
      knownArtistIds.add(match.artist_id);
    }
  }

  const uniqueTracks = [...new Map(tracks.map((track) => [track.id, track])).values()];
  return { artists, tracks: uniqueTracks };
}

function tracksForMix(
  allTracks: SeedTrack[],
  mixIndex: number,
  dayKey: string,
  userId: string
) {
  const rotated = seededShuffle(allTracks, `${dayKey}:${userId}:tracks`);
  return clusterByMixIndex(rotated, mixIndex).slice(0, 3);
}

function artistsForMix(artists: SeedArtist[], mixIndex: number, dayKey: string, userId: string) {
  const rotated = seededShuffle(artists, `${dayKey}:${userId}:artists`);
  return clusterByMixIndex(rotated, mixIndex)
    .filter((artist) => artist.id)
    .slice(0, 3);
}

async function buildMix(
  mixIndex: number,
  token: string,
  userId: string,
  dayKey: string,
  artists: SeedArtist[],
  seedTracks: SeedTrack[]
): Promise<DailyMixPayload> {
  const mixArtists = artistsForMix(artists, mixIndex, dayKey, userId);
  const mixSeedTracks = tracksForMix(seedTracks, mixIndex, dayKey, userId);
  const seen = new Set<string>();
  const tracks: SimilarTrack[] = [];

  const seedTrackIds = mixSeedTracks.map((track) => track.id).slice(0, 2);
  const seedArtistIds = mixArtists.map((artist) => artist.id).filter(Boolean).slice(0, 2);

  if (seedTrackIds.length > 0 || seedArtistIds.length > 0) {
    try {
      const data = (await getRecommendations(seedTrackIds, seedArtistIds, token, 25)) as {
        tracks?: unknown[];
      };
      for (const raw of data.tracks ?? []) {
        addTrack(tracks, seen, normalizeSimilarTrack(raw), DAILY_MIX_TRACKS);
      }
    } catch {
      // fall through to artist tops
    }
  }

  for (const artist of mixArtists) {
    if (tracks.length >= DAILY_MIX_TRACKS) break;
    try {
      const data = (await getArtistTopTracks(artist.id, token)) as { tracks?: unknown[] };
      for (const raw of data.tracks ?? []) {
        addTrack(tracks, seen, normalizeSimilarTrack(raw), DAILY_MIX_TRACKS);
      }
    } catch {
      // try next artist
    }
  }

  if (tracks.length < 12) {
    try {
      const data = await getUserTopTracks(token, 20);
      for (const raw of (data as { items?: unknown[] }).items ?? []) {
        addTrack(tracks, seen, normalizeSimilarTrack(raw), DAILY_MIX_TRACKS);
      }
    } catch {
      // ignore
    }
  }

  const finalTracks = seededShuffle(tracks, `${dayKey}:${userId}:mix:${mixIndex}`).slice(
    0,
    DAILY_MIX_TRACKS
  );
  const subtitleArtists = [
    ...mixArtists.map((artist) => artist.name),
    ...finalTracks.flatMap((track) => track.artists.map((artist) => artist.name)),
  ];

  return {
    id: `daily-${dayKey}-${mixIndex}`,
    name: `Daily Mix ${mixIndex + 1}`,
    subtitle: buildMixSubtitle(subtitleArtists),
    image: finalTracks[0]?.album?.images?.[0]?.url ?? mixSeedTracks[0]?.image ?? null,
    trackCount: finalTracks.length,
    tracks: finalTracks,
  };
}

export async function GET() {
  const session = await getApiSessionWithToken();
  if (!session) return unauthorized();

  const dayKey = getDayKey();
  const cacheKey = `${session.userId}:${dayKey}`;
  const cached = mixCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(
      { dayKey, mixes: cached.mixes },
      {
        headers: {
          "Cache-Control": `private, max-age=${secondsUntilUtcDayEnd()}, stale-while-revalidate=300`,
        },
      }
    );
  }

  try {
    const { artists, tracks } = await loadUserSignals(session.userId);
    const token = session.accessToken as string;
    const mixes: DailyMixPayload[] = [];

    for (let mixIndex = 0; mixIndex < DAILY_MIX_COUNT; mixIndex++) {
      const mix = await buildMix(mixIndex, token, session.userId, dayKey, artists, tracks);
      if (mix.trackCount > 0) mixes.push(mix);
    }

    if (mixes.length === 0) {
      try {
        const data = await getUserTopTracks(token, DAILY_MIX_TRACKS);
        const fallbackTracks = compactTracks((data as { items?: unknown[] }).items ?? []).slice(
          0,
          DAILY_MIX_TRACKS
        );
        if (fallbackTracks.length > 0) {
          mixes.push({
            id: `daily-${dayKey}-0`,
            name: "Daily Mix",
            subtitle: "Your top tracks today",
            image: fallbackTracks[0]?.album?.images?.[0]?.url ?? null,
            trackCount: fallbackTracks.length,
            tracks: fallbackTracks,
          });
        }
      } catch {
        // ignore
      }
    }

    mixCache.set(cacheKey, {
      mixes,
      expires: Date.now() + secondsUntilUtcDayEnd() * 1000,
    });
    if (mixCache.size > 200) {
      const oldest = mixCache.keys().next().value;
      if (oldest) mixCache.delete(oldest);
    }

    return NextResponse.json(
      { dayKey, mixes },
      {
        headers: {
          "Cache-Control": `private, max-age=${secondsUntilUtcDayEnd()}, stale-while-revalidate=300`,
        },
      }
    );
  } catch (error) {
    console.error("[daily-mix]", error);
    return NextResponse.json({ dayKey, mixes: [] }, { status: 200 });
  }
}
