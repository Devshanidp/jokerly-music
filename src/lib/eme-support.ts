/** Web Playback SDK uses EME; only map known DRM failures to a friendly message. */

function isWindowsDesktopApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.__SHANSMUSIC_DESKTOP__?.platform === "windows";
}

export function formatPlaybackEnvironmentError(raw?: string): string {
  const trimmed = raw?.trim() || "";
  const text = trimmed.toLowerCase();
  if (
    text.includes("setservercertificate") ||
    text.includes("generaterequest") ||
    text.includes("no supported keysystem") ||
    text.includes("requestmediakeysystemaccess") ||
    text.includes("platform does not support")
  ) {
    if (isWindowsDesktopApp()) {
      return "Protected audio (DRM) failed in the Windows app. Reinstall the latest ShaN'sMusic installer, then Retry. Spotify Premium is required.";
    }
    return "Protected audio (DRM) is blocked in this browser. Use HTTPS, allow protected content in site settings, and try Chrome, Edge, or Safari. Privacy extensions can also block playback.";
  }
  if (text.includes("secure context") || text.includes("only secure origins")) {
    return "Playback requires HTTPS. Open https://music.devshanidp.xyz (not http://).";
  }
  // Spotify often emits a bare "Playback error" with no useful detail.
  if (!trimmed || text === "playback error" || text === "playback failed") {
    if (isWindowsDesktopApp()) {
      return "Spotify could not start playback. Confirm Spotify Premium, close other Spotify players, then tap Retry.";
    }
    return "Spotify could not start playback. Confirm Premium, close other Spotify players, and try again.";
  }
  return trimmed;
}

export function getInsecurePlaybackMessage(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) {
    return "Playback requires HTTPS. Open https://music.devshanidp.xyz (not http://).";
  }
  return null;
}
