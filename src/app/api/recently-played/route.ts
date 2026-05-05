import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recently_played")
    .select("*")
    .eq("user_id", session.spotifyId)
    .order("played_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.track_uri || !body?.track_name || !body?.track_artist) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase.from("recently_played").upsert(
    {
      user_id: session.spotifyId,
      track_uri: body.track_uri,
      track_name: body.track_name,
      track_artist: body.track_artist,
      track_image: body.track_image ?? null,
      played_at: new Date().toISOString(),
    },
    { onConflict: "user_id,track_uri" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Trim to 20 most recent (fire and forget)
  void supabase.rpc("trim_recently_played", { p_user_id: session.spotifyId });

  return NextResponse.json({ ok: true });
}
