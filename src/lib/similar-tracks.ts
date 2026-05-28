import { getArtist, getArtistTopTracks, searchSpotify } from "@/lib/spotify";
import { spotifyTrackIdFromUri } from "@/lib/spotify-track-id";

const SPOTIFY_BASE = "https://api.spotify.com/v1";

export type SimilarTrack = {
  id: string;
  uri: string;
  name: string;
  artists: { id?: string; name: string }[];
  album?: { id?: string; name?: string; images?: { url: string }[] };
  duration_ms?: number;
  external_urls?: { spotify: string };
};

type SeedContext = {
  trackId: string | null;
  trackUri: string | null;
  trackName: string;
  artistName: string;
  primaryArtistId: string | null;
  artistIds: string[];
  albumId: string | null;
  albumName: string | null;
  genres: string[];
};

async function spotifyGet(url: string, accessToken: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function compactTracks(items: unknown[]): SimilarTrack[] {
  const out: SimilarTrack[] = [];
  for (const raw of items) {
    const track = normalizeSimilarTrack(raw);
    if (track) out.push(track);
  }
  return out;
}

export function normalizeSimilarTrack(raw: unknown): SimilarTrack | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const linked = item.linked_from as { id?: string } | undefined;
  const id = (typeof item.id === "string" ? item.id : null) ?? linked?.id ?? null;
  if (!id) return null;

  const uri =
    (typeof item.uri === "string" ? item.uri : null) ?? `spotify:track:${id}`;
  const name = typeof item.name === "string" ? item.name : null;
  if (!name) return null;

  const artists: { id?: string; name: string }[] = [];
  if (Array.isArray(item.artists)) {
    for (const a of item.artists) {
      const artist = a as { id?: string; name?: string };
      if (artist?.name) artists.push({ id: artist.id, name: artist.name });
    }
  }

  const albumRaw = item.album as Record<string, unknown> | undefined;

  return {
    id,
    uri,
    name,
    artists: artists.length > 0 ? artists : [{ name: "Unknown Artist" }],
    album: albumRaw
      ? {
          id: typeof albumRaw.id === "string" ? albumRaw.id : undefined,
          name: typeof albumRaw.name === "string" ? albumRaw.name : undefined,
          images: Array.isArray(albumRaw.images)
            ? (albumRaw.images as { url: string }[])
            : undefined,
        }
      : undefined,
    duration_ms:
      typeof item.duration_ms === "number" ? item.duration_ms : undefined,
    external_urls: item.external_urls as { spotify: string } | undefined,
  };
}

function dedupeTracks(
  tracks: SimilarTrack[],
  excludeUri?: string | null,
  excludeId?: string | null,
  excludeIds: Set<string> = new Set()
): SimilarTrack[] {
  const seen = new Set<string>();
  const result: SimilarTrack[] = [];

  for (const track of tracks) {
    if (!track?.id || !track?.uri) continue;
    if (excludeUri && track.uri === excludeUri) continue;
    if (excludeId && track.id === excludeId) continue;
    if (excludeIds.has(track.id)) continue;
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    result.push(track);
  }

  return result;
}

function scoreTrack(track: SimilarTrack, seed: SeedContext): number {
  let score = 0;
  const trackArtistIds = new Set(
    track.artists.map((a) => a.id).filter((id): id is string => !!id)
  );
  const primaryName = seed.artistName.split(",")[0].trim().toLowerCase();

  if (seed.albumId && track.album?.id === seed.albumId) score += 28;
  if (seed.albumName && track.album?.name?.toLowerCase() === seed.albumName.toLowerCase()) {
    score += 12;
  }

  for (const artistId of seed.artistIds) {
    if (trackArtistIds.has(artistId)) score += 18;
  }

  const trackArtistNames = track.artists.map((a) => a.name.toLowerCase());
  if (trackArtistNames.some((n) => n.includes(primaryName) || primaryName.includes(n))) {
    score += 10;
  } else if (seed.primaryArtistId && !trackArtistIds.has(seed.primaryArtistId)) {
    score += 14;
  }

  const trackName = track.name.toLowerCase();
  const seedName = seed.trackName.toLowerCase();
  if (trackName !== seedName && trackName.split(" ")[0] === seedName.split(" ")[0]) {
    score += 4;
  }

  return score;
}

function rankByRelevance(tracks: SimilarTrack[], seed: SeedContext): SimilarTrack[] {
  return [...tracks].sort((a, b) => scoreTrack(b, seed) - scoreTrack(a, seed));
}

async function safeSearch(
  query: string,
  type: string,
  accessToken: string,
  limit = 10,
  offset = 0
): Promise<unknown> {
  if (!query.trim()) return null;
  try {
    return await searchSpotify(query, type, accessToken, limit, offset);
  } catch {
    return null;
  }
}

async function searchTracks(
  query: string,
  accessToken: string,
  limit = 10,
  offset = 0
): Promise<SimilarTrack[]> {
  const data = (await safeSearch(query, "track", accessToken, limit, offset)) as {
    tracks?: { items?: unknown[] };
  } | null;
  return compactTracks(data?.tracks?.items ?? []);
}

async function topTracksForArtist(
  artistId: string,
  accessToken: string
): Promise<SimilarTrack[]> {
  try {
    const data = (await getArtistTopTracks(artistId, accessToken)) as { tracks?: unknown[] };
    return compactTracks(data?.tracks ?? []);
  } catch {
    return [];
  }
}

async function fetchTrackMeta(
  trackId: string,
  accessToken: string
): Promise<SimilarTrack | null> {
  const data = await spotifyGet(`${SPOTIFY_BASE}/tracks/${trackId}`, accessToken);
  return normalizeSimilarTrack(data);
}

async function resolveArtistId(
  artistName: string,
  hintArtistId: string | null,
  accessToken: string
): Promise<string | null> {
  if (hintArtistId) return hintArtistId;

  const primaryArtist = artistName.split(",")[0].trim();
  if (!primaryArtist) return null;

  const attempts = [`artist:"${primaryArtist}"`, `artist:${primaryArtist}`, primaryArtist];
  for (const query of attempts) {
    const data = (await safeSearch(query, "artist", accessToken, 5)) as {
      artists?: { items?: { id: string; name: string }[] };
    } | null;
    const items = data?.artists?.items ?? [];
    const match =
      items.find((item) => item.name.toLowerCase() === primaryArtist.toLowerCase()) ??
      items[0];
    if (match?.id) return match.id;
  }

  return null;
}

async function buildSeedContext(
  trackId: string | null,
  trackUri: string | null,
  trackName: string,
  artistName: string,
  accessToken: string
): Promise<SeedContext> {
  const fromUri = spotifyTrackIdFromUri(trackUri);
  const resolvedId = trackId?.trim() || fromUri || null;
  const primary = artistName.split(",")[0].trim();

  const [metaFromId, resolvedArtistId] = await Promise.all([
    resolvedId ? fetchTrackMeta(resolvedId, accessToken) : Promise.resolve(null),
    primary ? resolveArtistId(primary, null, accessToken) : Promise.resolve(null),
  ]);

  let meta = metaFromId;
  if (!meta && trackName && primary) {
    const items = await searchTracks(`${trackName} ${primary}`, accessToken, 8, 0);
    meta =
      items.find(
        (item) =>
          item.name.toLowerCase() === trackName.toLowerCase() &&
          item.artists.some((a) => a.name.toLowerCase().includes(primary.toLowerCase()))
      ) ?? items[0] ?? null;
  }

  const artistIds = new Set<string>();
  const genres = new Set<string>();

  if (meta?.artists) {
    for (const a of meta.artists) {
      if (a.id) artistIds.add(a.id);
    }
  }

  const primaryArtistId = meta?.artists?.[0]?.id ?? resolvedArtistId ?? null;
  if (primaryArtistId) artistIds.add(primaryArtistId);
  if (resolvedArtistId) artistIds.add(resolvedArtistId);

  const genreArtistId = primaryArtistId ?? resolvedArtistId;
  if (genreArtistId) {
    const profile = (await getArtist(genreArtistId, accessToken).catch(() => null)) as {
      genres?: string[];
    } | null;
    for (const g of profile?.genres ?? []) {
      if (g) genres.add(g);
    }
  }

  return {
    trackId: meta?.id ?? resolvedId,
    trackUri,
    trackName,
    artistName,
    primaryArtistId,
    artistIds: [...artistIds],
    albumId: meta?.album?.id ?? null,
    albumName: meta?.album?.name ?? null,
    genres: [...genres],
  };
}

async function fetchAlbumTracks(
  albumId: string,
  accessToken: string
): Promise<SimilarTrack[]> {
  const album = (await spotifyGet(`${SPOTIFY_BASE}/albums/${albumId}`, accessToken)) as {
    id?: string;
    name?: string;
    images?: { url: string }[];
    release_date?: string;
    album_type?: string;
    external_urls?: { spotify: string };
  } | null;
  if (!album?.id) return [];

  const tracksData = (await spotifyGet(
    `${SPOTIFY_BASE}/albums/${albumId}/tracks?limit=50`,
    accessToken
  )) as { items?: unknown[] } | null;

  const merged: unknown[] = (tracksData?.items ?? []).map((item) => ({
    ...(typeof item === "object" && item ? item : {}),
    album: {
      id: album.id,
      name: album.name,
      images: album.images,
      release_date: album.release_date,
      album_type: album.album_type,
      external_urls: album.external_urls,
    },
  }));

  return compactTracks(merged);
}

function artistNamesFromString(artistName: string): string[] {
  return [...new Set(artistName.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 4);
}

function artistSearchQuery(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.includes(" ") ? `artist:"${trimmed}"` : `artist:${trimmed}`;
}

/** Fast path — parallel top tracks + search, no slow nested loops. */
export async function fetchSimilarTracksFallback(
  accessToken: string,
  trackName: string,
  artistName: string,
  limit: number,
  refreshSeed: number,
  existing: SimilarTrack[] = []
): Promise<SimilarTrack[]> {
  const artists = artistNamesFromString(artistName);
  const primary = artists[0] ?? "";
  if (!primary && !trackName) return existing.slice(0, limit);

  const seen = new Set(existing.map((t) => t.id));
  const out = [...existing];

  const artistResolves = await Promise.allSettled(
    artists.map((name) => resolveArtistId(name, null, accessToken))
  );
  const artistIds = [
    ...new Set(
      artistResolves
        .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((id): id is string => !!id)
    ),
  ];

  const topResults = await Promise.allSettled(
    artistIds.map((id) => topTracksForArtist(id, accessToken))
  );
  for (const result of topResults) {
    if (result.status !== "fulfilled") continue;
    for (const t of result.value) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
      if (out.length >= limit) return out.slice(0, limit);
    }
  }

  const queries = [
    ...artists.map(artistSearchQuery).filter(Boolean),
    trackName && primary ? `${trackName} ${primary}` : "",
    trackName,
    primary,
  ].filter(Boolean);

  const searchJobs = queries.slice(0, 6).map((q, i) => {
    const idx = (i + refreshSeed) % queries.length;
    const query = queries[idx];
    const offset = refreshSeed * 10 + i * 5;
    return searchTracks(query, accessToken, 10, offset);
  });

  const searchResults = await Promise.allSettled(searchJobs);
  for (const result of searchResults) {
    if (result.status !== "fulfilled") continue;
    for (const t of result.value) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
      if (out.length >= limit) return out.slice(0, limit);
    }
  }

  return out.slice(0, limit);
}

export async function fetchSimilarTracks(
  accessToken: string,
  options: {
    trackId?: string | null;
    trackUri?: string | null;
    trackName: string;
    artistName: string;
    limit?: number;
    excludeIds?: string[];
    refreshSeed?: number;
  }
): Promise<SimilarTrack[]> {
  const limit = options.limit ?? 15;
  const excluded = options.excludeIds ?? [];
  const refreshSeed = Math.max(0, options.refreshSeed ?? 0);
  const excludeUri = options.trackUri ?? null;
  const excludeIds = new Set(excluded);
  const primary = options.artistName.split(",")[0].trim();

  // Run fast fallback in parallel with seed building so results aren't blocked.
  const [seed, fallbackTracks] = await Promise.all([
    buildSeedContext(
      options.trackId ?? null,
      options.trackUri ?? null,
      options.trackName,
      options.artistName,
      accessToken
    ),
    fetchSimilarTracksFallback(
      accessToken,
      options.trackName,
      options.artistName,
      limit,
      refreshSeed
    ),
  ]);

  let tracks: SimilarTrack[] = [...fallbackTracks];

  const tasks: Promise<SimilarTrack[]>[] = [];

  if (seed.albumId) tasks.push(fetchAlbumTracks(seed.albumId, accessToken));

  if (options.trackName && primary) {
    tasks.push(
      searchTracks(`${options.trackName} ${primary}`, accessToken, 10, refreshSeed * 6)
    );
  }

  if (seed.albumName) {
    tasks.push(searchTracks(`album:"${seed.albumName}"`, accessToken, 10, refreshSeed * 4));
  }

  if (seed.genres.length > 0) {
    const genre = seed.genres[refreshSeed % seed.genres.length];
    tasks.push(searchTracks(`genre:${genre}`, accessToken, 10, refreshSeed * 12));
  }

  const settled = await Promise.allSettled(tasks);
  for (const source of settled) {
    if (source.status === "fulfilled") tracks.push(...source.value);
  }

  let result = dedupeTracks(rankByRelevance(tracks, seed), excludeUri, seed.trackId, excludeIds);
  if (result.length >= limit) return result.slice(0, limit);

  result = await fetchSimilarTracksFallback(
    accessToken,
    options.trackName,
    options.artistName,
    limit,
    refreshSeed + 1,
    result
  );

  return dedupeTracks(
    rankByRelevance(result, seed),
    excludeUri,
    seed.trackId,
    excludeIds
  ).slice(0, limit);
}
