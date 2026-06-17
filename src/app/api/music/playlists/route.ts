import { auth } from "@/lib/auth";
import { compilePlaylist, parseSelectedArtists } from "@/lib/compile-playlist";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  // Single query — embed track count to avoid a second round-trip
  const { data: playlists, error } = await supabase
    .from("playlists")
    .select("id, name, description, image, playlist_tracks(count)")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (playlists ?? []).map((pl) => ({
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
  const session = await auth();
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    description?: unknown;
    selectedArtists?: unknown;
  };
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const selectedArtists = parseSelectedArtists(body.selectedArtists);

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (selectedArtists.length > 0 && !session.accessToken) {
    return NextResponse.json({ error: "Session expired — please log in again" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playlists")
    .insert({
      user_id: session.userId,
      name,
      description,
      image: "",
    })
    .select("id, name, description, image")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let addedCount = 0;

  if (selectedArtists.length > 0 && session.accessToken) {
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
