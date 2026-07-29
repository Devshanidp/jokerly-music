"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  getWallpaper,
  onWallpaperChange,
  type WallpaperRecord,
} from "@/lib/wallpaper";

export default function WallpaperLayer() {
  const [wallpaper, setWallpaper] = useState<WallpaperRecord | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
      root.style.setProperty(
        "--wallpaper-dim",
        String(Math.min(0.85, Math.max(0.15, wallpaper.dim ?? 0.45)))
      );
      root.style.setProperty("--wallpaper-image", `url("${wallpaper.dataUrl}")`);
    } else {
      root.classList.remove("has-wallpaper");
      root.style.removeProperty("--wallpaper-dim");
      root.style.removeProperty("--wallpaper-image");
    }
    return () => {
      root.classList.remove("has-wallpaper");
      root.style.removeProperty("--wallpaper-dim");
      root.style.removeProperty("--wallpaper-image");
    };
  }, [wallpaper]);

  if (!mounted || !wallpaper?.dataUrl) return null;

  // Portal to body so no parent transform/filter breaks `position: fixed` while scrolling.
  return createPortal(
    <div aria-hidden className="app-wallpaper">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={wallpaper.dataUrl}
        alt=""
        className="app-wallpaper__img"
        decoding="async"
        draggable={false}
      />
      <div className="app-wallpaper__dim" />
    </div>,
    document.body
  );
}
