export const MIX_DESCRIPTION_PREFIX = "Mix of ";
export const MIX_META_PREFIX = "mix_artists:";

export type MixArtist = { id: string; name: string };

export function formatMixDescription(artists: MixArtist[]): string {
  const names = artists.map((artist) => artist.name).join(", ");
  const meta = encodeURIComponent(JSON.stringify(artists));
  return `${MIX_DESCRIPTION_PREFIX}${names}\n${MIX_META_PREFIX}${meta}`;
}

function normalizeMixArtist(artist: unknown): MixArtist | null {
  if (typeof artist !== "object" || artist === null) return null;
  const name = typeof (artist as MixArtist).name === "string" ? (artist as MixArtist).name.trim() : "";
  if (!name) return null;
  const rawId = (artist as MixArtist).id;
  const id = typeof rawId === "string" ? rawId.trim() : "";
  return { id, name };
}

export function parseMixArtistRecords(description?: string | null): MixArtist[] {
  if (!description) return [];

  const metaLine = description.split("\n").find((line) => line.startsWith(MIX_META_PREFIX));
  if (metaLine) {
    const payload = metaLine.slice(MIX_META_PREFIX.length);
    for (const decode of [true, false] as const) {
      try {
        const raw = decode ? decodeURIComponent(payload) : payload;
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          return parsed
            .map(normalizeMixArtist)
            .filter((artist): artist is MixArtist => artist !== null);
        }
      } catch {
        // try next decode strategy
      }
    }
  }

  return parseMixArtists(description).map((name) => ({ id: "", name }));
}

export function parseMixArtists(description?: string | null): string[] {
  if (!description) return [];
  const firstLine = description.split("\n")[0];
  if (!firstLine.startsWith(MIX_DESCRIPTION_PREFIX)) return [];
  return firstLine
    .slice(MIX_DESCRIPTION_PREFIX.length)
    .split(", ")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function isMixPlaylist(description?: string | null): boolean {
  return !!description?.startsWith(MIX_DESCRIPTION_PREFIX);
}

export function trackMatchesArtist(trackArtist: string | null | undefined, artistName: string): boolean {
  if (!trackArtist || !artistName) return false;
  const target = artistName.toLowerCase();
  return trackArtist
    .toLowerCase()
    .split(",")
    .map((part) => part.trim())
    .some((part) => part === target || part.startsWith(`${target} `));
}

export function mixArtistsEqual(a: MixArtist[], b: MixArtist[]): boolean {
  if (a.length !== b.length) return false;
  const bIds = new Set(b.map((artist) => artist.id || artist.name));
  return a.every((artist) => bIds.has(artist.id || artist.name));
}

export function diffMixArtists(
  previous: MixArtist[],
  next: MixArtist[]
): { added: MixArtist[]; removed: MixArtist[] } {
  const prevKey = (artist: MixArtist) => artist.id || artist.name;
  const nextKeys = new Set(next.map(prevKey));
  const prevKeys = new Set(previous.map(prevKey));

  return {
    added: next.filter((artist) => !prevKeys.has(prevKey(artist))),
    removed: previous.filter((artist) => !nextKeys.has(prevKey(artist))),
  };
}
