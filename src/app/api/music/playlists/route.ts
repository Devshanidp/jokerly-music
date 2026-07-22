import { getApiSession, unauthorized } from "@/lib/api-auth";
import { compilePlaylist, parseSelectedArtists } from "@/lib/compile-playlist";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const supabase = await createClient();

  // Single query — embed track count to avoid a second round-trip
  const { data: playlists, error } = await supabase
    .from("playlists")
    .select("id, name, description, image, playlist_tracks(count)")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (playlists ?? []).map((pl: any) => ({
    id: pl.id,
    name: pl.name,
    description: pl.description ?? "",
    images: pl.image ? [{ url: pl.image }] : [],
    tracks: { total: (pl.playlist_tracks as unknown as { count: number }[])?.[0]?.count ?? 0 },
    owner: { display_name: "You" },
    external_urls: { web: "" },
  }));

  return NextResponse.json({ items }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}

export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    description?: unknown;
    selectedArtists?: unknown;
    tracks?: unknown;
  };
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const selectedArtists = parseSelectedArtists(body.selectedArtists);
  const tracks = Array.isArray(body.tracks)
    ? body.tracks
        .map((raw) => {
          if (!raw || typeof raw !== "object") return null;
          const t = raw as Record<string, unknown>;
          const uri = typeof t.uri === "string" ? t.uri.trim() : "";
          const trackName = typeof t.name === "string" ? t.name.trim() : "";
          if (!uri || !trackName) return null;
          return {
            uri,
            name: trackName,
            image: typeof t.image === "string" ? t.image : null,
            artist: typeof t.artist === "string" ? t.artist : null,
          };
        })
        .filter((t): t is { uri: string; name: string; image: string | null; artist: string | null } => Boolean(t))
    : [];

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (selectedArtists.length > 0 && !session.accessToken) {
    return NextResponse.json({ error: "Session expired — please log in again" }, { status: 401 });
  }
  if (selectedArtists.length > 0 && tracks.length > 0) {
    return NextResponse.json({ error: "Pass either selectedArtists or tracks, not both" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playlists")
    .insert({
      user_id: session.userId,
      name,
      description,
      image: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, name, description, image")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let addedCount = 0;

  if (tracks.length > 0) {
    const seen = new Set<string>();
    const rows = tracks
      .filter((t) => {
        if (seen.has(t.uri)) return false;
        seen.add(t.uri);
        return true;
      })
      .map((t, index) => ({
        user_id: session.userId,
        playlist_id: data.id,
        track_uri: t.uri,
        track_name: t.name,
        track_image: t.image,
        track_artist: t.artist,
        position: index + 1,
        added_at: new Date().toISOString(),
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("playlist_tracks").insert(rows);
      if (insertError) {
        await supabase.from("playlists").delete().eq("id", data.id).eq("user_id", session.userId);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      addedCount = rows.length;

      // Prefer first track art as playlist cover when none set
      const cover = rows.find((r) => r.track_image)?.track_image;
      if (cover) {
        await supabase
          .from("playlists")
          .update({ image: cover, updated_at: new Date().toISOString() })
          .eq("id", data.id)
          .eq("user_id", session.userId);
        data.image = cover;
      }
    }
  } else if (selectedArtists.length > 0 && session.accessToken) {
    try {
      const result = await compilePlaylist(
        session.accessToken,
        data.id,
        session.userId,
        selectedArtists,
        supabase
      );
      addedCount = result.addedCount;
    } catch (e) {
      await supabase.from("playlists").delete().eq("id", data.id).eq("user_id", session.userId);
      return NextResponse.json(
        { error: (e as Error).message ?? "Could not compile playlist from artists" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ...data,
    images: data.image ? [{ url: data.image }] : [],
    tracks: { total: addedCount },
    addedCount,
    owner: { display_name: "You" },
    external_urls: { web: "" },
  });
}
