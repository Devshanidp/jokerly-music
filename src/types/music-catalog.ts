export interface MusicImage {
  url: string;
  width?: number;
  height?: number;
}

export interface MusicArtistSimple {
  id: string;
  name: string;
  external_urls: { web: string };
}

export interface MusicAlbumSimple {
  id: string;
  name: string;
  images: MusicImage[];
  external_urls: { web: string };
  release_date: string;
  album_type: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  artists: MusicArtistSimple[];
  album: MusicAlbumSimple;
  duration_ms: number;
  uri: string;
  external_urls: { web: string };
  preview_url: string | null;
  popularity?: number;
}

export interface MusicArtist {
  id: string;
  name: string;
  images: MusicImage[];
  genres: string[];
  followers: { total: number };
  external_urls: { web: string };
  uri: string;
  popularity?: number;
}

export interface MusicAlbum {
  id: string;
  name: string;
  artists: MusicArtistSimple[];
  images: MusicImage[];
  release_date: string;
  total_tracks: number;
  external_urls: { web: string };
  album_type: string;
  uri: string;
}

export function trackImage(track: MusicTrack): string | undefined {
  return track.album?.images?.[0]?.url;
}

export function artistImage(artist: MusicArtist): string | undefined {
  return artist.images?.[0]?.url;
}

export function albumImage(album: MusicAlbum): string | undefined {
  return album.images?.[0]?.url;
}

export function artistNames(track: MusicTrack): string {
  return track.artists.map((a) => a.name).join(", ");
}

/** Map raw catalog API payloads to app types. */
export function externalWebUrl(urls?: { web?: string; [key: string]: string | undefined }): string {
  if (!urls) return "";
  return urls.web ?? urls[Object.keys(urls)[0] ?? ""] ?? "";
}

export function normalizeExternalUrls(
  urls?: { web?: string; [key: string]: string | undefined }
): { web: string } {
  return { web: externalWebUrl(urls) };
}
