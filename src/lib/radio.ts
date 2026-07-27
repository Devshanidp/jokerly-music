import { PlayableTrack } from "@/store/player";
import { trackIdFromUri } from "@/lib/track-uri";

type RecommendationItem = {
  id?: string;
  uri?: string;
  name?: string;
  artists?: { name?: string }[];
  album?: { images?: { url?: string }[] };
  duration_ms?: number;
};

export function toPlayableFromRecommendation(item: RecommendationItem): PlayableTrack | null {
  if (!item?.name || !item?.uri) return null;
  return {
    name: item.name,
    artist: (item.artists ?? []).map((a) => a.name).filter(Boolean).join(", ") || "Unknown",
    image: item.album?.images?.[0]?.url,
    uri: item.uri,
    durationMs: item.duration_ms,
  };
}

export async function fetchRadioTracks(
  seed: PlayableTrack,
  options?: { excludeIds?: string[]; limit?: number; refresh?: number }
): Promise<PlayableTrack[]> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 5), 30);
  const params = new URLSearchParams({
    limit: String(limit),
    track: seed.name,
    artist: seed.artist || "Unknown",
    refresh: String(options?.refresh ?? 0),
  });
  const trackId = trackIdFromUri(seed.uri);
  if (trackId) params.set("trackId", trackId);
  if (seed.uri) params.set("trackUri", seed.uri);

  const exclude = (options?.excludeIds ?? []).filter(Boolean).slice(-80);
  if (exclude.length > 0) params.set("exclude", exclude.join(","));

  const res = await fetch(`/api/music/recommendations?${params}`, {
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as {
    tracks?: RecommendationItem[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || "Could not start radio");
  }

  const seedKey = seed.uri || `${seed.name}::${seed.artist}`;
  return (data.tracks ?? [])
    .map(toPlayableFromRecommendation)
    .filter((track): track is PlayableTrack => {
      if (!track) return false;
      const key = track.uri || `${track.name}::${track.artist}`;
      return key !== seedKey;
    });
}
