import { getApiSessionWithToken } from "@/lib/api-auth";
import { searchCatalog, getPlaylistTracks } from "@/lib/music-api";
import { createClient } from "@/lib/supabase/server";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const ALLOWED_ERAS = [
  "1950s",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010s",
] as const;

type Era = (typeof ALLOWED_ERAS)[number];

const recommendationsSchema = z.object({
  songs: z
    .array(
      z.object({
        title: z.string().min(1),
        artist: z.string().min(1),
      })
    )
    .min(5)
    .max(12),
});

type ResolvedTrack = {
  uri: string;
  name: string;
  artist: string;
  image: string | null;
};

function isEra(value: string): value is Era {
  return (ALLOWED_ERAS as readonly string[]).includes(value);
}

function seedLabel(seeds: string): string {
  const first = seeds.split(/[,;\n]/)[0]?.trim() ?? seeds.trim();
  const short = first.length > 28 ? `${first.slice(0, 25)}…` : first;
  return short || "seeds";
}

function trackFromCatalogItem(trackItem: any): ResolvedTrack | null {
  if (!trackItem?.uri || !trackItem?.name) return null;
  return {
    uri: trackItem.uri,
    name: trackItem.name,
    artist: trackItem.artists?.[0]?.name || trackItem.artist || "Unknown",
    image: trackItem.album?.images?.[0]?.url || trackItem.images?.[0]?.url || null,
  };
}

async function resolveSong(
  title: string,
  artist: string,
  accessToken: string
): Promise<ResolvedTrack | null> {
  const query = `${title} ${artist}`.trim();
  try {
    const searchResults: any = await searchCatalog(query, "track", accessToken, 5);
    const items = searchResults?.tracks?.items || searchResults?.items || [];
    for (const item of items) {
      const track = trackFromCatalogItem(item);
      if (track) return track;
    }
  } catch (e) {
    console.warn("[time-machine] resolve failed:", query, e);
  }
  return null;
}

async function recommendWithAi(seeds: string, era: Era): Promise<{ title: string; artist: string }[]> {
  const { object } = await generateObject({
    model: "openai/gpt-5.4-mini",
    schema: recommendationsSchema,
    system: `You are a music time machine. Analyze the vibe, tempo, and energy of the given seed songs. Recommend exactly 10 real songs from the ${era} that have the same musical feel (groove, energy, mood, danceability). Return only song titles and artists — no commentary. Prefer well-known, catalog-findable recordings released in that decade.`,
    prompt: `Seed songs:\n${seeds}\n\nTarget era: ${era}\nRecommend 10 matching songs from the ${era}.`,
  });
  return object.songs.slice(0, 10);
}

async function fallbackCatalogTracks(
  seeds: string,
  era: Era,
  accessToken: string
): Promise<ResolvedTrack[]> {
  const resolved: ResolvedTrack[] = [];
  const seen = new Set<string>();

  const tryAdd = (track: ResolvedTrack | null) => {
    if (!track || seen.has(track.uri)) return;
    seen.add(track.uri);
    resolved.push(track);
  };

  try {
    const playlistSearch: any = await searchCatalog(
      `${era} ${seeds}`.slice(0, 120),
      "playlist",
      accessToken,
      3
    );
    const playlists = playlistSearch?.playlists?.items || [];
    const best = playlists[0];
    if (best?.id) {
      try {
        const tracksRes: any = await getPlaylistTracks(best.id, accessToken, 12);
        for (const item of tracksRes.items || []) {
          tryAdd(trackFromCatalogItem(item.track));
          if (resolved.length >= 10) return resolved;
        }
      } catch (e) {
        console.warn("[time-machine] playlist tracks fallback skipped:", e);
      }
    }
  } catch (e) {
    console.warn("[time-machine] playlist search fallback failed:", e);
  }

  if (resolved.length < 10) {
    try {
      const trackSearch: any = await searchCatalog(
        `${era} ${seedLabel(seeds)}`.slice(0, 100),
        "track",
        accessToken,
        15
      );
      const items = trackSearch?.tracks?.items || trackSearch?.items || [];
      for (const item of items) {
        tryAdd(trackFromCatalogItem(item));
        if (resolved.length >= 10) break;
      }
    } catch (e) {
      console.warn("[time-machine] track search fallback failed:", e);
    }
  }

  return resolved.slice(0, 10);
}

export async function POST(req: NextRequest) {
  const session = await getApiSessionWithToken();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const seeds = typeof body.seeds === "string" ? body.seeds.trim() : "";
  const eraRaw = typeof body.era === "string" ? body.era.trim() : "";

  if (!seeds) {
    return NextResponse.json({ error: "Seed songs are required" }, { status: 400 });
  }
  if (!isEra(eraRaw)) {
    return NextResponse.json(
      { error: `Era must be one of: ${ALLOWED_ERAS.join(", ")}` },
      { status: 400 }
    );
  }
  const era = eraRaw;

  try {
    let resolvedTracks: ResolvedTrack[] = [];
    let usedAi = false;

    try {
      const picks = await recommendWithAi(seeds, era);
      const seen = new Set<string>();
      for (const pick of picks) {
        const track = await resolveSong(pick.title, pick.artist, session.accessToken!);
        if (track && !seen.has(track.uri)) {
          seen.add(track.uri);
          resolvedTracks.push(track);
        }
      }
      usedAi = resolvedTracks.length > 0;
    } catch (e) {
      console.warn("[time-machine] AI recommend failed, using catalog fallback:", e);
    }

    if (resolvedTracks.length < 5) {
      const fallback = await fallbackCatalogTracks(seeds, era, session.accessToken!);
      const seen = new Set(resolvedTracks.map((t) => t.uri));
      for (const track of fallback) {
        if (seen.has(track.uri)) continue;
        seen.add(track.uri);
        resolvedTracks.push(track);
        if (resolvedTracks.length >= 10) break;
      }
    }

    resolvedTracks = resolvedTracks.slice(0, 10);

    if (resolvedTracks.length === 0) {
      return NextResponse.json(
        { error: "Could not find matching tracks in the catalog for that era" },
        { status: 404 }
      );
    }

    const supabase = await createClient();
    const playlistName = `⏳ ${era} · ${seedLabel(seeds)}`;
    const playlistDesc = usedAi
      ? `Time Machine: ${era} songs matching the vibe of ${seeds.slice(0, 160)}`
      : `Time Machine (catalog mix): ${era} inspired by ${seeds.slice(0, 160)}`;

    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .insert({
        user_id: session.userId,
        name: playlistName,
        description: playlistDesc,
        image: resolvedTracks[0]?.image || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (playlistError || !playlist) {
      throw new Error(playlistError?.message || "Failed to create playlist");
    }

    const tracksToInsert = resolvedTracks.map((track, index) => ({
      user_id: session.userId,
      playlist_id: playlist.id,
      track_uri: track.uri,
      track_name: track.name,
      track_artist: track.artist,
      track_image: track.image,
      position: index + 1,
      added_at: new Date().toISOString(),
    }));

    const { error: tracksError } = await supabase.from("playlist_tracks").insert(tracksToInsert);

    if (tracksError) {
      await supabase.from("playlists").delete().eq("id", playlist.id);
      throw new Error("Failed to add tracks to the Time Machine playlist");
    }

    return NextResponse.json({
      success: true,
      playlistId: playlist.id,
      name: playlistName,
      trackCount: resolvedTracks.length,
      usedAi,
    });
  } catch (error: any) {
    console.error("[time-machine]", error);
    return NextResponse.json(
      { error: error.message || "Failed to travel through time" },
      { status: 500 }
    );
  }
}
