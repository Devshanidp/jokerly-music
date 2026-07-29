"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePlayerStore } from "@/store/player";

/**
 * Keep Spotify Web Playback alive across soft navigations.
 * Heavy page mounts can briefly pause the SDK; resume without waiting for the user.
 */
export default function PlaybackRouteKeepAlive() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (prev === null || prev === pathname) return;

    const snap = usePlayerStore.getState();
    if (!snap.currentTrack?.uri) return;

    // Immediate + staggered: heavy page mounts can pause the SDK mid-transition.
    void snap.maintainPlayback(true);
    const timers = [40, 160, 400, 900].map((ms) =>
      window.setTimeout(() => {
        void usePlayerStore.getState().maintainPlayback(true);
      }, ms)
    );

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [pathname]);

  return null;
}
