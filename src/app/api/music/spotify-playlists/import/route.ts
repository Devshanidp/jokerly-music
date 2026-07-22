import { getApiSessionWithToken, unauthorized } from "@/lib/api-auth";
import { getAllPlaylistTracks } from "@/lib/music-api";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getApiSessionWithToken();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as {
    spotifyPlaylistId?: string;
    name?: string;
    image?: string | null;
    pin?: boolean;
  };

  const spotifyPlaylistId = String(body.spotifyPlaylistId ?? "").trim();
  if (!spotifyPlaylistId) {
    return NextResponse.json({ error: "spotifyPlaylistId required" }, { status: 400 });
  }

  try {
    const items = await getAllPlaylistTracks(spotifyPlaylistId, session.accessToken, 200);
    const resolvedTracks: {
      uri: string;
      name: string;
      artist: string | null;
      image: string | null;
    }[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const track = item?.track;
      if (!track?.uri || seen.has(track.uri)) continue;
      seen.add(track.uri);
      resolvedTracks.push({
        uri: track.uri,
        name: track.name || "Track",
        artist: track.artists?.[0]?.name ?? null,
        image: track.album?.images?.[0]?.url ?? track.images?.[0]?.url ?? null,
      });
    }

    if (resolvedTracks.length === 0) {
      return NextResponse.json(
        { error: "That playlist has no playable tracks (or Spotify blocked access)" },
        { status: 404 }
      );
    }

    const name = String(body.name ?? "Imported playlist").trim() || "Imported playlist";
    const image = body.image || resolvedTracks[0]?.image || "";
    const pin = Boolean(body.pin);

    const supabase = await createClient();
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .insert({
        user_id: session.userId,
        name,
        description: "Imported from Spotify",
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
      pinned: pin,
    });
  } catch (e: any) {
    console.error("[spotify-playlists import]", e);
    const status = e?.status === 401 || e?.status === 403 ? 401 : 500;
    return NextResponse.json(
      { error: e?.message || "Import failed" },
      { status }
    );
  }
}
