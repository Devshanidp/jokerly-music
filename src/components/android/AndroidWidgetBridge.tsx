"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePlayerStore } from "@/store/player";
import { clearAndroidWidgetState, isAndroidTwa, syncAndroidWidgetState } from "@/lib/android-widget";

function useWidgetPlayerToggle() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("player") !== "toggle") return;
    void usePlayerStore.getState().togglePlay();

    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("player");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [searchParams]);
}

function useWidgetStateSync() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (!isAndroidTwa()) return;
    if (!currentTrack) {
      clearAndroidWidgetState();
      return;
    }
    syncAndroidWidgetState({
      title: currentTrack.name,
      artist: currentTrack.artist,
      image: currentTrack.image ?? null,
      playing: isPlaying,
    });
  }, [currentTrack, isPlaying]);
}

export default function AndroidWidgetBridge() {
  useWidgetPlayerToggle();
  useWidgetStateSync();
  return null;
}
