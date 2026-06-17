import { getApiSessionWithToken, unauthorized, tokenExpired } from "@/lib/api-auth";
import { getTracksByIds, CatalogApiError } from "@/lib/music-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getApiSessionWithToken();
  if (!session) return unauthorized();

  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);

  if (!ids.length) return NextResponse.json({ tracks: [] });

  try {
    const data = await getTracksByIds(ids, session.accessToken);
    // Return only what the client needs: id, image URL, artist names
    const tracks = (data.tracks ?? []).map((t: {
      id: string;
      album?: { images?: { url: string }[] };
      artists?: { name: string }[];
    }) => ({
      id: t.id,
      image: t.album?.images?.[0]?.url ?? null,
      artist: t.artists?.map((a) => a.name).join(", ") ?? "",
    }));
    return NextResponse.json({ tracks });
  } catch (e) {
    const status = e instanceof CatalogApiError ? e.status : 502;
    return NextResponse.json({ tracks: [], error: (e as Error).message }, { status });
  }
}
