import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** Public share payload — UUID is the access key. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing playlist id" }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: playlist, error } = await supabase
      .from("playlists")
      .select("id, name, description, image, user_id")
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

    const { data: tracks, error: tracksError } = await supabase
      .from("playlist_tracks")
      .select("track_uri, track_name, track_image, track_artist, position")
      .eq("playlist_id", id)
      .order("position", { ascending: true });

    if (tracksError) return NextResponse.json({ error: tracksError.message }, { status: 500 });

    return NextResponse.json(
      {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description ?? "",
        image: playlist.image ?? "",
        ownerId: playlist.user_id,
        trackCount: (tracks ?? []).length,
        tracks: (tracks ?? []).map((t) => ({
          uri: t.track_uri,
          name: t.track_name,
          image: t.track_image ?? null,
          artist: t.track_artist ?? null,
        })),
      },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("[share GET]", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
