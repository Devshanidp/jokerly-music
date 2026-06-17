import { auth } from "@/lib/auth";
import { searchCatalog } from "@/lib/music-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track")?.trim();
  const artist = searchParams.get("artist")?.trim();

  if (!track || !artist) {
    return NextResponse.json({ uri: null, imageUrl: null, durationMs: null });
  }

  try {
    const query = `track:${track} artist:${artist}`;
    const data = await searchCatalog(query, "track", session.accessToken, 5);
    const first = data?.tracks?.items?.[0];

    if (!first) {
      return NextResponse.json({ uri: null, imageUrl: null, durationMs: null });
    }

    return NextResponse.json({
      uri: first.uri ?? null,
      imageUrl: first.album?.images?.[0]?.url ?? null,
      durationMs: typeof first.duration_ms === "number" ? first.duration_ms : null,
      name: first.name ?? null,
      artist: Array.isArray(first.artists) ? first.artists.map((a: { name?: string }) => a.name).filter(Boolean).join(", ") : null,
    });
  } catch {
    return NextResponse.json({ uri: null, imageUrl: null, durationMs: null });
  }
}
