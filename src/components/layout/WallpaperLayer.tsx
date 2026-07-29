"use client";

import { useEffect, useState } from "react";
import {
  getWallpaper,
  onWallpaperChange,
  type WallpaperRecord,
} from "@/lib/wallpaper";

export default function WallpaperLayer() {
  const [wallpaper, setWallpaper] = useState<WallpaperRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getWallpaper().then((rec) => {
      if (!cancelled) setWallpaper(rec);
    });
    const off = onWallpaperChange((rec) => setWallpaper(rec));
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (wallpaper?.dataUrl) {
      root.classList.add("has-wallpaper");
      root.style.setProperty("--wallpaper-dim", String(Math.min(0.85, Math.max(0.15, wallpaper.dim ?? 0.45))));
    } else {
      root.classList.remove("has-wallpaper");
      root.style.removeProperty("--wallpaper-dim");
    }
    return () => {
      root.classList.remove("has-wallpaper");
      root.style.removeProperty("--wallpaper-dim");
    };
  }, [wallpaper]);

  if (!wallpaper?.dataUrl) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={wallpaper.dataUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        decoding="async"
      />
      <div
        className="absolute inset-0"
        style={{
          background: `rgba(0,0,0,var(--wallpaper-dim, 0.45))`,
        }}
      />
    </div>
  );
}
