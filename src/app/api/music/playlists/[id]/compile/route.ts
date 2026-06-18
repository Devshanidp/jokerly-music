import { getApiSessionWithToken, unauthorized } from "@/lib/api-auth";
import { compilePlaylist, parseSelectedArtists } from "@/lib/compile-playlist";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getApiSessionWithToken();
  if (!session) {
    return unauthorized();
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { selectedArtists?: unknown };
  const selectedArtists = parseSelectedArtists(body.selectedArtists);

  if (selectedArtists.length === 0) {
    return NextResponse.json({ error: "selectedArtists required" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    const result = await compilePlaylist(
      session.accessToken,
      id,
      session.userId,
      selectedArtists,
      supabase
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not compile playlist" },
      { status: 500 }
    );
  }
}
