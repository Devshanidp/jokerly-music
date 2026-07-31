export interface CachedPlaylistTrack {
  id: string;
  track_uri: string;
  track_name: string;
  track_image?: string | null;
  track_artist?: string | null;
  added_at: string;
  position: number;
}

/** Module cache so /playlists and home pinned opens stay instant across remounts. */
const playlistTracksCache = new Map<string, CachedPlaylistTrack[]>();
const tracksPrefetchInFlight = new Set<string>();

export function rememberPlaylistTracks(id: string, items: CachedPlaylistTrack[]) {
  playlistTracksCache.set(id, items);
}

export function getCachedPlaylistTracks(id: string): CachedPlaylistTrack[] | undefined {
  return playlistTracksCache.get(id);
}

export function clearCachedPlaylistTracks(id: string) {
  playlistTracksCache.delete(id);
}

export function seedPlaylistTracksMap(): Record<string, CachedPlaylistTrack[]> {
  const seed: Record<string, CachedPlaylistTrack[]> = {};
  playlistTracksCache.forEach((items, id) => {
    seed[id] = items;
  });
  return seed;
}

export function beginTracksPrefetch(id: string): boolean {
  if (playlistTracksCache.has(id) || tracksPrefetchInFlight.has(id)) return false;
  tracksPrefetchInFlight.add(id);
  return true;
}

export function endTracksPrefetch(id: string) {
  tracksPrefetchInFlight.delete(id);
}
