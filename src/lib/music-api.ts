import { CATALOG_API_V1 } from "@/lib/catalog-endpoints";

export class CatalogApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "CatalogApiError";
  }
}

async function catalogFetch(url: string, accessToken: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CatalogApiError(res.status, `Catalog API ${res.status}: ${body}`);
    }
    return res.json();
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === "AbortError") throw new CatalogApiError(504, "Catalog request timed out");
    throw e;
  }
}

function buildSearchUrl(query: string, type: string, limit: number, offset = 0) {
  const safeLimit = Math.floor(Math.max(1, Math.min(limit, 10)));
  let url = `${CATALOG_API_V1}/search?q=${encodeURIComponent(query)}&type=${type}&limit=${safeLimit}`;
  if (offset > 0) url += `&offset=${Math.min(Math.floor(offset), 100)}`;
  return url;
}

export async function searchCatalog(query: string, type: string, accessToken: string, limit = 20, offset = 0) {
  const T = 10_000;

  if (type !== "all") {
    return catalogFetch(buildSearchUrl(query, type, limit, offset), accessToken, T);
  }

  const [tracksResult, artistsResult, albumsResult] = await Promise.allSettled([
    catalogFetch(buildSearchUrl(query, "track", limit, offset), accessToken, T),
    catalogFetch(buildSearchUrl(query, "artist", limit, offset), accessToken, T),
    catalogFetch(buildSearchUrl(query, "album", limit, offset), accessToken, T),
  ]);

  if (tracksResult.status === "rejected" && artistsResult.status === "rejected" && albumsResult.status === "rejected") {
    throw tracksResult.reason;
  }

  return {
    tracks: tracksResult.status === "fulfilled" ? tracksResult.value.tracks : { items: [] },
    artists: artistsResult.status === "fulfilled" ? artistsResult.value.artists : { items: [] },
    albums: albumsResult.status === "fulfilled" ? albumsResult.value.albums : { items: [] },
  };
}

export async function getRecommendations(
  seedTracks: string[],
  seedArtists: string[],
  accessToken: string,
  limit = 20
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (seedTracks.length) params.set("seed_tracks", seedTracks.slice(0, 3).join(","));
  if (seedArtists.length) params.set("seed_artists", seedArtists.slice(0, 2).join(","));
  return catalogFetch(`${CATALOG_API_V1}/recommendations?${params}`, accessToken);
}

export async function getRecommendationsByGenre(genre: string, accessToken: string, limit = 20) {
  const params = new URLSearchParams({ seed_genres: genre, limit: String(limit) });
  return catalogFetch(`${CATALOG_API_V1}/recommendations?${params}`, accessToken);
}

export async function getRecommendationsByTrack(trackId: string, accessToken: string, limit = 20) {
  const params = new URLSearchParams({ seed_tracks: trackId, limit: String(limit) });
  return catalogFetch(`${CATALOG_API_V1}/recommendations?${params}`, accessToken);
}

export async function getUserTopTracks(accessToken: string, limit = 20) {
  return catalogFetch(`${CATALOG_API_V1}/me/top/tracks?limit=${limit}&time_range=short_term`, accessToken);
}

export async function getUserTopArtists(accessToken: string, limit = 10) {
  return catalogFetch(`${CATALOG_API_V1}/me/top/artists?limit=${limit}&time_range=short_term`, accessToken);
}

export async function getUserPlaylists(accessToken: string) {
  return catalogFetch(`${CATALOG_API_V1}/me/playlists?limit=50`, accessToken);
}

export async function getArtist(artistId: string, accessToken: string) {
  return catalogFetch(`${CATALOG_API_V1}/artists/${artistId}`, accessToken);
}

export async function getArtistTopTracks(artistId: string, accessToken: string) {
  return catalogFetch(
    `${CATALOG_API_V1}/artists/${artistId}/top-tracks?market=from_token`,
    accessToken,
    5000
  );
}

export async function getRelatedArtists(artistId: string, accessToken: string) {
  return catalogFetch(`${CATALOG_API_V1}/artists/${artistId}/related-artists`, accessToken, 5000);
}

export async function getTracksByIds(ids: string[], accessToken: string) {
  const safeIds = ids.slice(0, 50).join(",");
  return catalogFetch(`${CATALOG_API_V1}/tracks?ids=${safeIds}`, accessToken);
}
