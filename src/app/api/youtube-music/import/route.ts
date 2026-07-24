import { getApiSessionWithToken, unauthorized } from "@/lib/api-auth";
import { searchCatalog } from "@/lib/music-api";
import { createClient } from "@/lib/supabase/server";
import { getYTPlaylistTracks } from "@/lib/youtubeMusic";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_TRACKS = 200;
const RESOLVE_BATCH = 5;

type ResolvedTrack = {
  uri: string;
  name: string;
  artist: string | null;
  image: string | null;
};

function trackFromCatalogItem(trackItem: any): ResolvedTrack | null {
  if (!trackItem?.uri || !trackItem?.name) return null;
  return {
    uri: trackItem.uri,
    name: trackItem.name,
    artist: trackItem.artists?.[0]?.name || trackItem.artist || null,
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
  } catch {
    // skip unmatched
  }
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getApiSessionWithToken();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as {
    cookieString?: string;
    playlistId?: string;
    name?: string;
    image?: string | null;
    pin?: boolean;
  };

  const cookieString = String(body.cookieString ?? "").trim();
  const playlistId = String(body.playlistId ?? "").trim();
  if (!cookieString) {
    return NextResponse.json({ error: "Cookie string is required" }, { status: 400 });
  }
  if (!playlistId) {
    return NextResponse.json({ error: "playlistId required" }, { status: 400 });
  }

  try {
    const detail = await getYTPlaylistTracks(cookieString, playlistId);
    const sourceTracks = detail.tracks.slice(0, MAX_TRACKS);
    if (sourceTracks.length === 0) {
      return NextResponse.json(
        { error: "That playlist has no tracks (or YouTube Music blocked access)" },
        { status: 404 }
      );
    }

    const resolvedTracks: ResolvedTrack[] = [];
    const seen = new Set<string>();
    let unresolved = 0;

    for (let i = 0; i < sourceTracks.length; i += RESOLVE_BATCH) {
      const batch = sourceTracks.slice(i, i + RESOLVE_BATCH);
      const results = await Promise.all(
        batch.map((t) => resolveSong(t.title, t.artist, session.accessToken!))
      );
      for (let j = 0; j < results.length; j++) {
        const track = results[j];
        if (!track) {
          unresolved += 1;
          continue;
        }
        if (seen.has(track.uri)) continue;
        seen.add(track.uri);
        const fallbackImage = batch[j]?.image ?? null;
        resolvedTracks.push({
          ...track,
          image: track.image || fallbackImage,
        });
      }
    }

    if (resolvedTracks.length === 0) {
      return NextResponse.json(
        { error: "Could not match any YouTube Music tracks in the catalog" },
        { status: 404 }
      );
    }

    const name =
      String(body.name ?? detail.name ?? "Imported playlist").trim() || "Imported playlist";
    const image = body.image || resolvedTracks[0]?.image || "";
    const pin = Boolean(body.pin);

    const supabase = await createClient();
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .insert({
        user_id: session.userId,
        name,
        description: "Imported from YouTube Music",
        image,
      })
      .select("id, name, description, image")
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: playlistError?.message || "Failed to create playlist" },
        { status: 500 }
      );
    }

    const rows = resolvedTracks.map((track, index) => ({
      user_id: session.userId,
      playlist_id: playlist.id,
      track_uri: track.uri,
      track_name: track.name,
      track_artist: track.artist,
      track_image: track.image,
      position: index + 1,
    }));

    const { error: tracksError } = await supabase.from("playlist_tracks").insert(rows);
    if (tracksError) {
      await supabase.from("playlists").delete().eq("id", playlist.id).eq("user_id", session.userId);
      return NextResponse.json({ error: tracksError.message }, { status: 500 });
    }

    if (pin) {
      await supabase.from("pinned_playlists").upsert({
        user_id: session.userId,
        playlist_id: playlist.id,
        playlist_name: playlist.name,
        playlist_image: playlist.image ?? "",
        pinned_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description ?? "",
      images: playlist.image ? [{ url: playlist.image }] : [],
      tracks: { total: rows.length },
      owner: { display_name: "You" },
      external_urls: { web: "" },
      importedCount: rows.length,
      unresolvedCount: unresolved,
      pinned: pin,
    });
  } catch (e: any) {
    const errorMessage = e?.message || "Import failed";
    console.error("[youtube-music import]", errorMessage);
    if (String(errorMessage).includes("401") || /auth|unauthor/i.test(String(errorMessage))) {
      return NextResponse.json(
        {
          error:
            "Authentication failed: paste the full Cookie header from music.youtube.com (DevTools → Network → Cookie)",
        },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
