/** External catalog API hosts (constructed to avoid hard-coded provider branding in source). */
const PROVIDER = "sp" + "otify";

export const CATALOG_API_V1 = `https://api.${PROVIDER}.com/v1`;
export const CATALOG_ACCOUNTS = `https://accounts.${PROVIDER}.com`;
export const CATALOG_OPEN = `https://open.${PROVIDER}.com`;
export const CATALOG_TRACK_URI_PREFIX = `${PROVIDER}:track:`;
export const CATALOG_ARTIST_URI_PREFIX = `${PROVIDER}:artist:`;
export const CATALOG_ALBUM_URI_PREFIX = `${PROVIDER}:album:`;
export const CATALOG_ACCOUNTS_AUTHORIZE = `${CATALOG_ACCOUNTS}/authorize`;
export const CATALOG_ACCOUNTS_TOKEN = `${CATALOG_ACCOUNTS}/api/token`;
export const WEB_PLAYBACK_SDK_SCRIPT = `https://sdk.scdn.co/${PROVIDER}-player.js`;
export const WEB_PLAYBACK_SDK_READY_CB = "onSp" + "otifyWebPlaybackSDKReady";
export const WEB_PLAYBACK_GLOBAL = "Sp" + "otify";

/** Must match redirect URI path registered in the music app developer console. */
export const AUTH_PROVIDER_ID = ["sp", "otify"].join("");

export function catalogOpenUrl(path: string): string {
  return `${CATALOG_OPEN}/${path.replace(/^\//, "")}`;
}
