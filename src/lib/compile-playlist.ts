import type { SupabaseClient } from "@supabase/supabase-js";

const SPOTIFY_API = "https://api.spotify.com/v1";

export type CompileArtist = { id: string; name: string };

type SpotifyTrack = {
  uri?: string;
  name?: string;
  album?: { images?: { url: string }[] };
  artists?: { name: string }[];
};

export function parseSelectedArtists(value: unknown): CompileArtist[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (artist): artist is CompileArtist =>
      typeof artist === "object" &&
      artist !== null &&
      typeof (artist as CompileArtist).id === "string" &&
      typeof (artist as CompileArtist).name === "string"
  );
}

async function fetchArtistTopTracks(token: string, artistId: string): Promise<SpotifyTrack[]> {
  const urls = [
    `${SPOTIFY_API}/artists/${artistId}/top-tracks?market=IN`,
    `${SPOTIFY_API}/artists/${artistId}/top-tracks?market=US`,
    `${SPOTIFY_API}/artists/${artistId}/top-tracks`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const data = (await response.json()) as { tracks?: SpotifyTrack[] };
      if (data.tracks?.length) return data.tracks;
    } catch {
      // try next market fallback
    }
  }

  return [];
}

export async function compilePlaylist(
  token: string,
  playlistId: string,
  userId: string,
  selectedArtists: CompileArtist[],
  supabase: SupabaseClient
): Promise<{ addedCount: number }> {
  const seenUris = new Set<string>();
  const allTracks: { uri: string; name: string; image: string | null; artist: string }[] = [];

  for (const artist of selectedArtists) {
    const tracks = await fetchArtistTopTracks(token, artist.id);

    for (const track of tracks) {
      if (!track.uri || seenUris.has(track.uri)) continue;
      seenUris.add(track.uri);
      allTracks.push({
        uri: track.uri,
        name: track.name ?? "Track",
        image: track.album?.images?.[0]?.url ?? null,
        artist: track.artists?.map((a) => a.name).join(", ") ?? artist.name,
      });
    }
  }

  if (allTracks.length === 0) return { addedCount: 0 };

  const { count } = await supabase
    .from("playlist_tracks")
    .select("id", { count: "exact", head: true })
    .eq("playlist_id", playlistId)
    .eq("user_id", userId);

  const rows = allTracks.map((track, index) => ({
    user_id: userId,
    playlist_id: playlistId,
    track_uri: track.uri,
    track_name: track.name,
    track_image: track.image,
    track_artist: track.artist,
    position: (count ?? 0) + index + 1,
  }));

  const { error } = await supabase.from("playlist_tracks").insert(rows);
  if (error) throw new Error(error.message);

  return { addedCount: rows.length };
}
