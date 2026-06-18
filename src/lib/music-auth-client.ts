import { AUTH_PROVIDER_ID } from "@/lib/catalog-endpoints";
import { MUSIC_AUTH_SCOPES } from "@/lib/music-scopes";

/** Forces account picker on sign-in. */
export const MUSIC_SIGN_IN_OPTIONS = {
  scope: MUSIC_AUTH_SCOPES,
  show_dialog: "true",
} as const;

export { AUTH_PROVIDER_ID };
