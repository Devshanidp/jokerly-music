import { AUTH_PROVIDER_ID } from "@/lib/catalog-endpoints";
import { MUSIC_AUTH_SCOPES } from "@/lib/music-scopes";

/** Forces account picker on sign-in. */
export const MUSIC_SIGN_IN_OPTIONS = {
  scope: MUSIC_AUTH_SCOPES,
  show_dialog: "true",
} as const;

export { AUTH_PROVIDER_ID };

/** Send user to login OAuth kickoff (CSRF cookie is set server-side there). */
export function goToMusicLogin(options?: { upgrade?: boolean; callbackUrl?: string }): void {
  const params = new URLSearchParams();
  if (options?.upgrade) params.set("upgrade", "1");
  if (options?.callbackUrl?.startsWith("/")) params.set("callbackUrl", options.callbackUrl);
  const qs = params.toString();
  window.location.assign(qs ? `/login/start?${qs}` : "/login/start");
}

/** Force Spotify consent UI so playlist / library write scopes can be approved. */
export function goToMusicPermissionUpgrade(callbackUrl = "/playlists"): void {
  goToMusicLogin({ upgrade: true, callbackUrl });
}
