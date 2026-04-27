import { auth } from "@/lib/auth";
import { getUserTopTracks, getRecommendationsByTrack, getRecommendationsByGenre } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";

const GENRE_MAP: Record<string, string> = { "r&b": "r-n-b" };

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get("trackId");
  const genre = searchParams.get("genre");

  try {
    if (trackId) {
      const data = await getRecommendationsByTrack(trackId, session.accessToken, 20);
      return NextResponse.json({ tracks: data.tracks ?? [] });
    }
    if (genre) {
      const seed = GENRE_MAP[genre] ?? genre;
      const data = await getRecommendationsByGenre(seed, session.accessToken, 20);
      return NextResponse.json({ tracks: data.tracks ?? [] });
    }
    const data = await getUserTopTracks(session.accessToken, 20);
    return NextResponse.json({ tracks: data.items ?? [] });
  } catch {
    try {
      const data = await getRecommendationsByGenre("pop", session.accessToken, 20);
      return NextResponse.json({ tracks: data.tracks ?? [] });
    } catch {
      return NextResponse.json({ tracks: [] });
    }
  }
}
