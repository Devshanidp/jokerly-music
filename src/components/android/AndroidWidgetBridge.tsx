"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePlayerStore } from "@/store/player";
import { clearAndroidWidgetState, isAndroidTwa, syncAndroidWidgetState } from "@/lib/android-widget";

function clearPlayerQueryParam() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("player")) return;
  url.searchParams.delete("player");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function runWidgetPlayerAction(action: string) {
  const state = usePlayerStore.getState();

  if (action === "toggle") {
    void state.togglePlay();
    return;
  }

  if (action === "next") {
    const next = state.getNextIndex();
    if (next === null || next === state.queueIndex) return;
    state.playIndex(next);
    return;
  }

  if (action === "prev") {
    if (state.progressMs > 3000) {
      state.seek(0);
      return;
    }
    const prev = state.getPrevIndex();
    if (prev === null || prev === state.queueIndex) {
      state.seek(0);
      return;
    }
    state.playIndex(prev);
  }
}

function useWidgetPlayerControls() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get("player");
    if (action !== "toggle" && action !== "next" && action !== "prev") return;
    runWidgetPlayerAction(action);
    clearPlayerQueryParam();
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
  useWidgetPlayerControls();
  useWidgetStateSync();
  return null;
}
