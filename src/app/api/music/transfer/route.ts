import { CATALOG_API_V1 } from "@/lib/catalog-endpoints";
import { getApiSessionWithToken, unauthorized } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { refreshAccessToken } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { catalogIdFromUri, isCatalogTrackUri } from "@/lib/track-uri";
import { externalWebUrl } from "@/types/music-catalog";
type TransferAction = "liked" | "playlist";

interface TransferBody {
  action?: TransferAction;
  playlistId?: string;
  public?: boolean;
}

interface PlaylistRow {
  id: string;
  name: string;
  description: string | null;
}

interface PlaylistTrackRow {
  track_uri: string;
}

interface LikedSongRow {
  track_uri: string;
}

interface LikedArtistRow {
  artist_id: string;
}

class CatalogApiError extends Error {
  constructor(public status: number, message: string, public details?: string) {
    super(message);
    this.name = "CatalogApiError";
  }
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function catalogErrorMessage(status: number, details: string) {
  const lower = details.toLowerCase();
  if (status === 401 || status === 403 || lower.includes("scope") || lower.includes("permission")) {
    return "A one-time permission upgrade is needed. Tap Continue with your account, approve it, then retry transfer.";
  }
  return details || `Catalog API ${status}`;
}

function errorStatus(error: unknown) {
  if (error instanceof CatalogApiError && (error.status === 401 || error.status === 403)) return 401;
  if (error instanceof CatalogApiError && error.status >= 400 && error.status < 500) return 400;
  return 502;
}

function bearerTokenFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

async function catalogRequest<T>(path: string, accessToken: string, init: RequestInit = {}) {
  const res = await fetch(`${CATALOG_API_V1}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new CatalogApiError(res.status, catalogErrorMessage(res.status, details), details);
  }

  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

async function getRefreshedAccessToken(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (!token) return null;
  const refreshed = await refreshAccessToken(token);
  if (refreshed.error || !refreshed.accessToken) return null;
  return refreshed.accessToken;
}

async function retryWithFreshToken<T>(
  req: NextRequest,
  accessToken: string,
  action: (token: string) => Promise<T>
) {
  try {
    return await action(accessToken);
  } catch (error) {
    if (!(error instanceof CatalogApiError) || error.status !== 401) throw error;

    const freshToken = await getRefreshedAccessToken(req);
    if (!freshToken || freshToken === accessToken) throw error;
    return action(freshToken);
  }
}

async function saveLikedSongs(accessToken: string, songs: LikedSongRow[]) {
  const trackIds = uniqueValues(songs.map((song) => catalogIdFromUri(song.track_uri, "track")));
  for (const ids of chunk(trackIds, 50)) {
    await catalogRequest("/me/tracks", accessToken, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    });
  }
  return trackIds.length;
}

async function followLikedArtists(accessToken: string, artists: LikedArtistRow[]) {
  const artistIds = uniqueValues(artists.map((artist) => catalogIdFromUri(artist.artist_id, "artist")));
  for (const ids of chunk(artistIds, 50)) {
    await catalogRequest(`/me/following?type=artist&ids=${encodeURIComponent(ids.join(","))}`, accessToken, {
      method: "PUT",
    });
  }
  return artistIds.length;
}

async function createMusicPlaylist(
  accessToken: string,
  playlist: PlaylistRow,
  tracks: PlaylistTrackRow[],
  isPublic: boolean
) {
  const profile = await catalogRequest<{ id: string }>("/me", accessToken);
  const created = await catalogRequest<{ id: string; external_urls?: { web?: string; [key: string]: string | undefined } }>(
    `/users/${encodeURIComponent(profile.id)}/playlists`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        name: playlist.name,
        description: playlist.description || "Transferred from Jokerly Music",
        public: isPublic,
      }),
    }
  );

  const allUris = tracks.map((track) => track.track_uri).filter(Boolean);
  const uris = uniqueValues(allUris.filter(isCatalogTrackUri));
  const skippedCount = allUris.length - uris.length;
  if (uris.length === 0) throw new CatalogApiError(400, "This playlist has no valid track URIs to transfer.");

  for (const batch of chunk(uris, 100)) {
    await catalogRequest(`/playlists/${encodeURIComponent(created.id)}/tracks`, accessToken, {
      method: "POST",
      body: JSON.stringify({ uris: batch }),
    });
  }

  return {
    remotePlaylistId: created.id,
    remotePlaylistUrl: externalWebUrl(created.external_urls) || null,
    trackCount: uris.length,
    skippedCount,
  };
}

export async function POST(req: NextRequest) {
  const session = await getApiSessionWithToken();
  if (!session) {
    return unauthorized();
  }

  const catalogAccessToken = bearerTokenFromRequest(req) ?? session.accessToken;
  const body = (await req.json()) as TransferBody;
  const supabase = await createClient();

  if (body.action === "liked") {
    const [songsResult, artistsResult] = await Promise.all([
      supabase.from("liked_songs").select("track_uri").eq("user_id", session.userId).order("liked_at", { ascending: false }),
      supabase.from("liked_artists").select("artist_id").eq("user_id", session.userId).order("liked_at", { ascending: false }),
    ]);

    if (songsResult.error) return NextResponse.json({ error: songsResult.error.message }, { status: 500 });
    if (artistsResult.error) return NextResponse.json({ error: artistsResult.error.message }, { status: 500 });

    const warnings: string[] = [];
    let savedSongCount = 0;
    let followedArtistCount = 0;

    try {
      savedSongCount = await retryWithFreshToken(req, catalogAccessToken, (token) =>
        saveLikedSongs(token, (songsResult.data ?? []) as LikedSongRow[])
      );
    } catch (error) {
      console.error("[library-transfer] liked songs transfer failed", error);
      if (error instanceof CatalogApiError && (error.status === 401 || error.status === 403)) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      warnings.push(`Liked songs were not saved: ${(error as Error).message}`);
    }

    try {
      followedArtistCount = await retryWithFreshToken(req, catalogAccessToken, (token) =>
        followLikedArtists(token, (artistsResult.data ?? []) as LikedArtistRow[])
      );
    } catch (error) {
      console.error("[library-transfer] liked artists transfer failed", error);
      if (savedSongCount === 0 && error instanceof CatalogApiError && (error.status === 401 || error.status === 403)) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      warnings.push(`Liked artists were not followed: ${(error as Error).message}`);
    }

    return NextResponse.json({ ok: warnings.length === 0, savedSongCount, followedArtistCount, warnings });
  }

  if (body.action === "playlist") {
    if (!body.playlistId) return NextResponse.json({ error: "Playlist id required" }, { status: 400 });

    const [playlistResult, tracksResult] = await Promise.all([
      supabase.from("playlists").select("id, name, description").eq("id", body.playlistId).eq("user_id", session.userId).single(),
      supabase.from("playlist_tracks").select("track_uri").eq("playlist_id", body.playlistId).eq("user_id", session.userId).order("position", { ascending: true }),
    ]);

    if (playlistResult.error) return NextResponse.json({ error: playlistResult.error.message }, { status: 500 });
    if (tracksResult.error) return NextResponse.json({ error: tracksResult.error.message }, { status: 500 });

    const tracks = (tracksResult.data ?? []) as PlaylistTrackRow[];
    if (tracks.length === 0) return NextResponse.json({ error: "Playlist has no tracks to transfer" }, { status: 400 });

    try {
      const created = await retryWithFreshToken(req, catalogAccessToken, (token) =>
        createMusicPlaylist(token, playlistResult.data as PlaylistRow, tracks, body.public ?? false)
      );
      return NextResponse.json({ ok: true, ...created });
    } catch (error) {
      console.error("[library-transfer] playlist transfer failed", error);
      return NextResponse.json({ error: (error as Error).message }, { status: errorStatus(error) });
    }
  }

  return NextResponse.json({ error: "Unsupported transfer action" }, { status: 400 });
}
