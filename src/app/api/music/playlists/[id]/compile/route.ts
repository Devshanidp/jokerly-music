import { auth } from "@/lib/auth";
import { compilePlaylist, parseSelectedArtists } from "@/lib/compile-playlist";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.accessToken || !session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
