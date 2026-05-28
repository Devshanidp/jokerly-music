import { getArtist, getArtistTopTracks, getUserTopTracks, searchSpotify } from "@/lib/spotify";
import { spotifyTrackIdFromUri } from "@/lib/spotify-track-id";

const SPOTIFY_BASE = "https://api.spotify.com/v1";
const TOP_TRACK_MARKETS = ["US", "IN", "GB", "DE", "from_token"];

export type SimilarTrack = {
  id: string;
  uri: string;
  name: string;
  artists: { id?: string; name: string }[];
  album?: { id?: string; name?: string; images?: { url: string }[] };
  duration_ms?: number;
  external_urls?: { spotify: string };
};

async function spotifyGet(url: string, accessToken: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12_000),
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

  const artistsRaw = Array.isArray(item.artists) ? item.artists : [];
  const artists: { id?: string; name: string }[] = [];
  for (const a of artistsRaw) {
    const artist = a as { id?: string; name?: string };
    if (artist?.name) artists.push({ id: artist.id, name: artist.name });
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

async function safeSearch(
  query: string,
  type: string,
  accessToken: string,
  limit = 10,
  offset = 0
): Promise<unknown> {
  try {
    return await searchSpotify(query, type, accessToken, limit, offset);
  } catch {
    return null;
  }
}

async function fetchTrackMeta(
  trackId: string,
  accessToken: string
): Promise<SimilarTrack | null> {
  const data = await spotifyGet(`${SPOTIFY_BASE}/tracks/${trackId}`, accessToken);
  return normalizeSimilarTrack(data);
}

async function resolveTrackId(
  trackId: string | null,
  trackUri: string | null,
  trackName: string,
  artistName: string,
  accessToken: string
): Promise<{ trackId: string | null; artistId: string | null; albumId: string | null }> {
  const fromParam = trackId?.trim() || null;
  const fromUri = spotifyTrackIdFromUri(trackUri);
  const resolvedId = fromParam ?? fromUri;

  if (resolvedId) {
    const meta = await fetchTrackMeta(resolvedId, accessToken);
    return {
      trackId: resolvedId,
      artistId: meta?.artists?.[0]?.id ?? null,
      albumId: meta?.album?.id ?? null,
    };
  }

  const primaryArtist = artistName.split(",")[0].trim();
  const queries = [
    `track:"${trackName}" artist:"${primaryArtist}"`,
    `track:${trackName} artist:${primaryArtist}`,
    `${trackName} ${primaryArtist}`,
    trackName,
  ];

  for (const query of queries) {
    const data = (await safeSearch(query, "track", accessToken, 10)) as {
      tracks?: { items?: unknown[] };
    } | null;
    const items = compactTracks(data?.tracks?.items ?? []);

    const exact =
      items.find(
        (item) =>
          item.name.toLowerCase() === trackName.toLowerCase() &&
          item.artists.some((artist) =>
            artist.name.toLowerCase().includes(primaryArtist.toLowerCase())
          )
      ) ?? items[0];

    if (exact?.id) {
      return {
        trackId: exact.id,
        artistId: exact.artists[0]?.id ?? null,
        albumId: exact.album?.id ?? null,
      };
    }
  }

  return { trackId: null, artistId: null, albumId: null };
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
    const data = (await safeSearch(query, "artist", accessToken, 8)) as {
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

async function fetchArtistTopTracks(
  artistId: string,
  accessToken: string
): Promise<SimilarTrack[]> {
  for (const market of TOP_TRACK_MARKETS) {
    const data = (await spotifyGet(
      `${SPOTIFY_BASE}/artists/${artistId}/top-tracks?market=${market}`,
      accessToken
    )) as { tracks?: unknown[] } | null;
    const tracks = compactTracks(data?.tracks ?? []);
    if (tracks.length > 0) return tracks;
  }

  try {
    const data = await getArtistTopTracks(artistId, accessToken);
    return compactTracks((data as { tracks?: unknown[] })?.tracks ?? []);
  } catch {
    return [];
  }
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

  const rawItems = tracksData?.items ?? [];
  const merged: unknown[] = rawItems.map((item) => ({
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

async function fetchTracksFromSimilarArtists(
  artistId: string,
  artistName: string,
  accessToken: string,
  poolSize: number,
  refreshSeed = 0
): Promise<SimilarTrack[]> {
  const primaryArtist = artistName.split(",")[0].trim();
  const collected: SimilarTrack[] = [];

  const artistSearch = (await safeSearch(
    primaryArtist,
    "artist",
    accessToken,
    10,
    refreshSeed * 3
  )) as { artists?: { items?: { id: string; name: string }[] } } | null;

  for (const artist of artistSearch?.artists?.items ?? []) {
    if (!artist?.id || artist.id === artistId) continue;
    collected.push(...(await fetchArtistTopTracks(artist.id, accessToken)));
    if (collected.length >= poolSize) break;
  }

  return collected;
}

async function fetchTracksFromGenreSearch(
  artistId: string | null,
  accessToken: string,
  poolSize: number
): Promise<SimilarTrack[]> {
  if (!artistId) return [];

  const artist = (await getArtist(artistId, accessToken).catch(() => null)) as {
    genres?: string[];
  } | null;
  const genre = artist?.genres?.[0];
  if (!genre) return [];

  const data = (await safeSearch(`genre:${genre}`, "track", accessToken, 10)) as {
    tracks?: { items?: unknown[] };
  } | null;
  return compactTracks(data?.tracks?.items ?? []).slice(0, poolSize);
}

async function fetchFromSearchFallback(
  trackName: string,
  artistName: string,
  accessToken: string,
  poolSize: number,
  refreshSeed = 0
): Promise<SimilarTrack[]> {
  const primaryArtist = artistName.split(",")[0].trim();
  const queries = [
    primaryArtist ? `artist:"${primaryArtist}"` : "",
    primaryArtist ? `artist:${primaryArtist}` : "",
    primaryArtist && trackName ? `${trackName} ${primaryArtist}` : "",
    primaryArtist || "",
    trackName || "",
    "popular",
  ].filter(Boolean);

  const collected: SimilarTrack[] = [];
  const ordered = [...queries.slice(refreshSeed % queries.length), ...queries];

  for (const query of ordered) {
    const data = (await safeSearch(query, "track", accessToken, 10)) as {
      tracks?: { items?: unknown[] };
    } | null;
    collected.push(...compactTracks(data?.tracks?.items ?? []));
    if (collected.length >= poolSize) break;
  }

  return collected;
}

export async function fetchUserTopTracksFallback(
  accessToken: string,
  limit: number
): Promise<SimilarTrack[]> {
  try {
    const data = await getUserTopTracks(accessToken, Math.min(limit, 20));
    return compactTracks((data as { items?: unknown[] })?.items ?? []);
  } catch {
    return [];
  }
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
  const poolSize = Math.max(limit * 4, 24, excluded.length * 2 + limit);
  const excludeUri = options.trackUri ?? null;
  const excludeIds = new Set(excluded);
  const refreshSeed = options.refreshSeed ?? 0;

  const { trackId: resolvedTrackId, artistId: hintArtistId, albumId } =
    await resolveTrackId(
      options.trackId ?? null,
      options.trackUri ?? null,
      options.trackName,
      options.artistName,
      accessToken
    );

  const artistId = await resolveArtistId(options.artistName, hintArtistId, accessToken);

  const sources = await Promise.allSettled([
    artistId ? fetchArtistTopTracks(artistId, accessToken) : Promise.resolve([]),
    artistId
      ? fetchTracksFromSimilarArtists(
          artistId,
          options.artistName,
          accessToken,
          poolSize,
          refreshSeed
        )
      : Promise.resolve([]),
    artistId
      ? fetchTracksFromGenreSearch(artistId, accessToken, poolSize)
      : Promise.resolve([]),
    albumId ? fetchAlbumTracks(albumId, accessToken) : Promise.resolve([]),
    fetchFromSearchFallback(
      options.trackName,
      options.artistName,
      accessToken,
      poolSize,
      refreshSeed
    ),
  ]);

  let tracks: SimilarTrack[] = [];
  for (const source of sources) {
    if (source.status === "fulfilled") tracks.push(...source.value);
  }

  const deduped = dedupeTracks(tracks, excludeUri, resolvedTrackId, excludeIds);
  if (deduped.length >= limit) return deduped.slice(0, limit);

  const topFallback = await fetchUserTopTracksFallback(accessToken, limit);
  tracks = dedupeTracks(
    [...deduped, ...topFallback],
    excludeUri,
    resolvedTrackId,
    excludeIds
  );

  return tracks.slice(0, limit);
}
