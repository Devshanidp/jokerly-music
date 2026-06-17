import type { MixArtist } from "@/lib/playlist-meta";
import type { MusicArtist } from "@/types/music-catalog";

/** Client: resolve missing catalog IDs via app search API */
export async function resolveMixArtistsClient(artists: MixArtist[]): Promise<MixArtist[]> {
  return Promise.all(
    artists.map(async (artist) => {
      if (artist.id?.trim()) {
        return { id: artist.id.trim(), name: artist.name };
      }
      const res = await fetch(
        `/api/music/search?q=${encodeURIComponent(artist.name)}&type=artist&limit=8`
      );
      const data = (await res.json().catch(() => ({}))) as { artists?: MusicArtist[] };
      const match =
        data.artists?.find((item) => item.name.toLowerCase() === artist.name.toLowerCase()) ??
        data.artists?.[0];
      return match ? { id: match.id, name: match.name } : artist;
    })
  );
}

export function mixArtistsNeedResolve(artists: MixArtist[]): boolean {
  return artists.some((artist) => !artist.id?.trim());
}
