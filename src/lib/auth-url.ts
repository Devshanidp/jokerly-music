/** Canonical site URL for OAuth callbacks (must match Spotify redirect URI + AUTH_URL). */
export const AUTH_SITE_URL = "https://music.devshanidp.xyz";

export const AUTH_CSRF_COOKIE = "__Host-authjs.csrf-token";

export function readCsrfTokenFromCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const [token] = cookieValue.split("|");
  return token || null;
}
