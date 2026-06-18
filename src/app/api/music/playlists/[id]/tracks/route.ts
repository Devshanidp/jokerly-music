import { getApiSession, unauthorized } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const { trackId } = await req.json();
  if (!trackId) return NextResponse.json({ error: "trackId required" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("playlist_tracks")
    .delete()
    .eq("id", trackId)
    .eq("playlist_id", id)
    .eq("user_id", session.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
