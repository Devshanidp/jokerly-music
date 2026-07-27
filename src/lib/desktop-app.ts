declare global {
  interface Window {
    __SHANSMUSIC_DESKTOP__?: {
      platform: "windows";
      version?: string;
    };
  }
}

export function isWindowsDesktopApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.__SHANSMUSIC_DESKTOP__?.platform === "windows";
}
