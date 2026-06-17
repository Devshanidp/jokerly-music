import { CATALOG_API_V1 } from "@/lib/catalog-endpoints";
import { auth } from "@/lib/auth";
import { getArtist } from "@/lib/music-api";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;



async function catalogGet(url: string, token: string) {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchTopTracks(artistId: string, token: string): Promise<any[]> {
  // Try without market (catalog uses user's country), then US fallback
  const d = await catalogGet(`${CATALOG_API_V1}/artists/${artistId}/top-tracks`, token);
  if (d?.tracks?.length) return d.tracks;
  const fb = await catalogGet(`${CATALOG_API_V1}/artists/${artistId}/top-tracks?market=US`, token);
  return fb?.tracks ?? [];
}

// Multi-page search using 3 query variations to maximise coverage
async function searchAllTracks(name: string, artistId: string, token: string): Promise<any[]> {
  const queries = [
    `artist:"${name}"`,          // exact credited artist
    `artist:${name}`,            // flexible artist field match
    name,                        // anywhere (catches featured credits)
  ];

  const pages = await Promise.allSettled(
    queries.map((q) =>
      catalogGet(`${CATALOG_API_V1}/search?q=${encodeURIComponent(q)}&type=track&limit=50`, token)
        .then((d) => d?.tracks?.items ?? [])
    )
  );

  const seen = new Set<string>();
  const result: any[] = [];

  // Merge all pages, dedup
  for (const p of pages) {
    if (p.status !== "fulfilled") continue;
    for (const t of p.value) {
      if (!t?.id || seen.has(t.id)) continue;
      seen.add(t.id);
      result.push(t);
    }
  }

  // Sort: directly credited tracks first
  return result.sort((a, b) => {
    const aD = a.artists?.some((ar: any) => ar.id === artistId) ? 0 : 1;
    const bD = b.artists?.some((ar: any) => ar.id === artistId) ? 0 : 1;
    return aD - bD;
  });
}

// Fetch tracks from artist albums — capped at 5 albums fetched sequentially
// to avoid bursting the catalog rate limit
async function fetchAlbumTracks(artistId: string, token: string): Promise<any[]> {
  const albums = await catalogGet(
    `${CATALOG_API_V1}/artists/${artistId}/albums?include_groups=album,single,appears_on&limit=10`,
    token
  );
  const items: any[] = albums?.items ?? [];
  if (!items.length) return [];

  const tracks: any[] = [];
  // Fetch up to 5 albums sequentially to avoid rate limiting
  for (const album of items.slice(0, 5)) {
    const d = await catalogGet(`${CATALOG_API_V1}/albums/${album.id}/tracks?limit=50`, token);
    const albumTracks: any[] = (d?.items ?? []).map((t: any) => ({
      ...t,
      album: { id: album.id, name: album.name, images: album.images },
    }));
    tracks.push(...albumTracks);
    if (tracks.length >= 150) break;
  }
  return tracks;
}

async function fetchArtistAlbums(artistId: string, token: string): Promise<any[]> {
  const albums = await catalogGet(
    `${CATALOG_API_V1}/artists/${artistId}/albums?include_groups=album,single&limit=20&market=from_token`,
    token
  );
  const items: any[] = albums?.items ?? [];
  if (!items.length) return [];

  const seen = new Set<string>();
  const deduped: any[] = [];

  for (const album of items) {
    const key = `${album.name ?? ""}::${album.album_type ?? ""}`.toLowerCase();
    if (!album?.id || seen.has(key)) continue;
    seen.add(key);
    deduped.push(album);
  }

  return deduped;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id   = searchParams.get("id");
  const name = searchParams.get("name") ?? "";

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const token = session.accessToken as string;

  // Stage 1: artist info + top tracks + search (controlled parallelism)
  const [infoRes, topRes, searchRes, albumRes] = await Promise.allSettled([
    getArtist(id, token),
    fetchTopTracks(id, token),
    searchAllTracks(name, id, token),
    fetchArtistAlbums(id, token),
  ]);

  const info      = infoRes.status  === "fulfilled" ? infoRes.value  : null;
  const topTracks = topRes.status   === "fulfilled" ? topRes.value   : [];
  const searchMore = searchRes.status === "fulfilled" ? searchRes.value : [];
  const albums = albumRes.status === "fulfilled" ? albumRes.value : [];

  if (!info) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  // Stage 2: album tracks (sequential, after stage 1 completes)
  const albumMore = await fetchAlbumTracks(id, token);

  const topIds = new Set((topTracks as any[]).map((t: any) => t.id));
  const seen = new Set(topIds);
  const moreTracks: any[] = [];

  // Album tracks first (richer data with images), then search results
  for (const t of [...albumMore, ...searchMore]) {
    if (!t?.id || seen.has(t.id)) continue;
    seen.add(t.id);
    moreTracks.push(t);
    if (moreTracks.length >= 100) break;
  }

  return NextResponse.json({ info, topTracks, moreTracks, albums });
}
