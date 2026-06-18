import { getApiSessionWithToken, unauthorized } from "@/lib/api-auth";
import { searchCatalog, CatalogApiError } from "@/lib/music-api";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await getApiSessionWithToken();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const type = searchParams.get("type") ?? "track";
  const rawLimit = parseInt(searchParams.get("limit") ?? "10", 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 10 : Math.min(rawLimit, 10);

  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  try {
    const data = await searchCatalog(q, type, session.accessToken, limit);
    return NextResponse.json({
      tracks: data.tracks?.items ?? [],
      artists: data.artists?.items ?? [],
      albums: data.albums?.items ?? [],
    });
  } catch (e) {
    console.error("Catalog search error:", e);
    const status = e instanceof CatalogApiError ? (e.status === 401 ? 401 : e.status === 429 ? 429 : 502) : 502;
    return NextResponse.json({ tracks: [], artists: [], albums: [], error: (e as Error).message }, { status });
  }
}
