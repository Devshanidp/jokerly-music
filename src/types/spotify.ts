export interface SpotifyImage {
  url: string;
  width?: number;
  height?: number;
}

export interface SpotifyArtistSimple {
  id: string;
  name: string;
  external_urls: { spotify: string };
}

export interface SpotifyAlbumSimple {
  id: string;
  name: string;
  images: SpotifyImage[];
  external_urls: { spotify: string };
  release_date: string;
  album_type: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtistSimple[];
  album: SpotifyAlbumSimple;
  duration_ms: number;
  uri: string;
  external_urls: { spotify: string };
  preview_url: string | null;
  popularity?: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  followers: { total: number };
  external_urls: { spotify: string };
  uri: string;
  popularity?: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: SpotifyArtistSimple[];
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
  external_urls: { spotify: string };
  album_type: string;
  uri: string;
}

export function trackImage(track: SpotifyTrack): string | undefined {
  return track.album?.images?.[0]?.url;
}

export function artistImage(artist: SpotifyArtist): string | undefined {
  return artist.images?.[0]?.url;
}

export function albumImage(album: SpotifyAlbum): string | undefined {
  return album.images?.[0]?.url;
}

export function artistNames(track: SpotifyTrack): string {
  return track.artists.map((a) => a.name).join(", ");
}
