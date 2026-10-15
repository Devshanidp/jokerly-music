import { CATALOG_ACCOUNTS_TOKEN } from "@/lib/catalog-endpoints";
import { musicClientId, musicClientSecret } from "@/lib/music-auth-env";

/** App-level (client credentials) token — catalog browsing only, no user data, no playback. */
let cached: { token: string; expiresAt: number } | null = null;
let inFlight: Promise<string | null> | null = null;

export async function getAppAccessToken(): Promise<string | null> {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(CATALOG_ACCOUNTS_TOKEN, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${musicClientId()}:${musicClientSecret()}`).toString("base64")}`,
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!data.access_token) return null;
      cached = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      };
      return cached.token;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
