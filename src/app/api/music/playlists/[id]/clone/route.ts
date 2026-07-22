import { getApiSession, unauthorized } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** Copy a shared playlist into the current user's library. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { pin?: boolean };
  const pin = Boolean(body.pin);

  try {
    const supabase = await createClient();
    const { data: source, error } = await supabase
      .from("playlists")
      .select("id, name, description, image, user_id")
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!source) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

    // Owner can just open their own — still allow clone for convenience
    const { data: tracks, error: tracksError } = await supabase
      .from("playlist_tracks")
      .select("track_uri, track_name, track_image, track_artist, position")
      .eq("playlist_id", id)
      .order("position", { ascending: true });

    if (tracksError) return NextResponse.json({ error: tracksError.message }, { status: 500 });

    const name =
      source.user_id === session.userId
        ? `${source.name} (copy)`
        : source.name;

    const { data: created, error: createError } = await supabase
      .from("playlists")
      .insert({
        user_id: session.userId,
        name,
        description: source.description ?? "",
        image: source.image ?? "",
      })
      .select("id, name, description, image")
      .single();

    if (createError || !created) {
      return NextResponse.json({ error: createError?.message || "Failed to create playlist" }, { status: 500 });
    }

    const rows = (tracks ?? []).map((t, index) => ({
      user_id: session.userId,
      playlist_id: created.id,
      track_uri: t.track_uri,
      track_name: t.track_name,
      track_image: t.track_image ?? null,
      track_artist: t.track_artist ?? null,
      position: t.position ?? index + 1,
    }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("playlist_tracks").insert(rows);
      if (insertError) {
        await supabase.from("playlists").delete().eq("id", created.id).eq("user_id", session.userId);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    if (pin) {
      await supabase.from("pinned_playlists").upsert({
        user_id: session.userId,
        playlist_id: created.id,
        playlist_name: created.name,
        playlist_image: created.image ?? "",
        pinned_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      id: created.id,
      name: created.name,
      description: created.description ?? "",
      images: created.image ? [{ url: created.image }] : [],
      tracks: { total: rows.length },
      owner: { display_name: "You" },
      external_urls: { web: "" },
      pinned: pin,
    });
  } catch (e) {
    console.error("[clone POST]", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
