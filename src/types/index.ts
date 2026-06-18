export interface MusicTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  preview_url: string | null;
  explicit: boolean;
  artists: MusicArtist[];
  album: MusicAlbum;
  external_urls: { web: string };
}

export interface MusicArtist {
  id: string;
  name: string;
  images?: { url: string; width: number; height: number }[];
  genres?: string[];
  followers?: { total: number };
  external_urls: { web: string };
}

export interface MusicAlbum {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  release_date: string;
  artists: MusicArtist[];
  external_urls: { web: string };
}

export interface MusicPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
  external_urls: { web: string };
}

export interface PinnedPlaylist {
  id: string;
  user_id: string;
  playlist_id: string;
  playlist_name: string;
  playlist_image: string;
  pinned_at: string;
}

export interface PinnedAlbum {
  id: string;
  user_id: string;
  album_id: string;
  album_name: string;
  album_image: string;
  artist_name: string;
  pinned_at: string;
}

export type SearchType = "track" | "artist" | "album" | "playlist";
