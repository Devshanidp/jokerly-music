export interface PreferencesPayload {
  languages?: unknown;
  favoriteArtists?: unknown;
  homeOrder?: unknown;
  degraded?: boolean;
  ok: boolean;
}

const PREFS_TTL = 60_000;

let cached: { data: PreferencesPayload; at: number } | null = null;
let inFlight: Promise<PreferencesPayload> | null = null;

/**
 * Home mounts several consumers that all need /api/preferences.
 * Share one request so navigating back doesn't fire duplicates.
 */
export function fetchPreferences(opts?: { force?: boolean }): Promise<PreferencesPayload> {
  if (!opts?.force && cached && Date.now() - cached.at < PREFS_TTL) {
    return Promise.resolve(cached.data);
  }
  if (!opts?.force && inFlight) return inFlight;

  inFlight = fetch("/api/preferences", {
    credentials: "same-origin",
    cache: "no-store",
  })
    .then(async (res) => {
      if (!res.ok) return { ok: false } as PreferencesPayload;
      const json = (await res.json()) as Omit<PreferencesPayload, "ok">;
      return { ...json, ok: true } as PreferencesPayload;
    })
    .catch(() => ({ ok: false }) as PreferencesPayload)
    .then((data) => {
      if (data.ok) cached = { data, at: Date.now() };
      inFlight = null;
      return data;
    });

  return inFlight;
}

export function clearPreferencesCache() {
  cached = null;
  inFlight = null;
}
