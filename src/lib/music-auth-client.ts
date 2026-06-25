import { AUTH_PROVIDER_ID } from "@/lib/catalog-endpoints";
import { MUSIC_AUTH_SCOPES } from "@/lib/music-scopes";
import { AUTH_SITE_URL } from "@/lib/auth-url";

/** Forces account picker on sign-in. */
export const MUSIC_SIGN_IN_OPTIONS = {
  scope: MUSIC_AUTH_SCOPES,
  show_dialog: "true",
} as const;

export { AUTH_PROVIDER_ID };

/** Send user to login page (CSRF cookie is set server-side there). */
export function goToMusicLogin(): void {
  window.location.assign("/login/start");
}
