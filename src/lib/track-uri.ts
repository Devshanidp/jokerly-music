import { CATALOG_TRACK_URI_PREFIX, CATALOG_ARTIST_URI_PREFIX } from "@/lib/catalog-endpoints";

export function trackIdFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  const escaped = CATALOG_TRACK_URI_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = uri.match(new RegExp(`${escaped}([A-Za-z0-9]+)`));
  return match?.[1] ?? null;
}

export function trackUriFromId(id: string): string {
  return `${CATALOG_TRACK_URI_PREFIX}${id}`;
}

export function catalogIdFromUri(uri: string, expectedType: "track" | "artist"): string {
  const prefix = expectedType === "track" ? CATALOG_TRACK_URI_PREFIX : CATALOG_ARTIST_URI_PREFIX;
  return uri.startsWith(prefix) ? uri.slice(prefix.length) : uri;
}

export function isCatalogTrackUri(uri: string): boolean {
  const escaped = CATALOG_TRACK_URI_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}[A-Za-z0-9]{22}$`).test(uri);
}
