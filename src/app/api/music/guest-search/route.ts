import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAppAccessToken } from "@/lib/app-token";
import { isGuestRequest } from "@/lib/guest";
import { searchCatalog } from "@/lib/music-api";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const jar = await cookies();
  if (!isGuestRequest(jar.getAll())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100);
  if (!q) return NextResponse.json({ tracks: [], artists: [], albums: [] });

  const token = await getAppAccessToken();
  if (!token) {
    return NextResponse.json({ tracks: [], artists: [], albums: [], error: "Catalog unavailable" }, { status: 503 });
  }

  try {
    const data = await searchCatalog(q, "all", token, 8);
    return NextResponse.json({
      tracks: data.tracks?.items ?? [],
      artists: data.artists?.items ?? [],
      albums: data.albums?.items ?? [],
    });
  } catch (e) {
    console.error("Guest search error:", (e as Error).message);
    return NextResponse.json({ tracks: [], artists: [], albums: [], error: "Search failed" }, { status: 502 });
  }
}
