import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.event_type) return NextResponse.json({ error: "Missing event_type" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("listening_analytics").insert({
    user_id: session.spotifyId,
    event_type: body.event_type,
    track_uri: body.track_uri ?? null,
    track_name: body.track_name ?? null,
    track_artist: body.track_artist ?? null,
    meta: body.meta ?? null,
    created_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
