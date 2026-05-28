"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { usePlayerStore } from "@/store/player";
import { useLikesStore } from "@/store/likes";
import { Play, Pause, SkipBack, SkipForward, X, Music, Repeat, Repeat1, Shuffle, ChevronDown, ListPlus, Loader2, Heart, Volume1, Volume2, VolumeX, ListOrdered, Timer, MicVocal } from "lucide-react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import AddToPlaylistModal from "@/components/playlist/AddToPlaylistModal";
import QueueSheet from "@/components/player/QueueSheet";
import LyricsPanel from "@/components/player/LyricsPanel";
import SimilarMusicSection from "@/components/player/SimilarMusicSection";
import { useToastStore } from "@/store/toast";
import { APP_NAME } from "@/lib/app";

function formatTime(seconds: number) {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildMediaArtwork(imageUrl?: string) {
  if (!imageUrl) return [] as MediaImage[];
  // iOS lock-screen behavior is inconsistent across versions; provide multiple sizes.
  const sizes = ["96x96", "128x128", "192x192", "256x256", "384x384", "512x512"];
  return sizes.map((size) => ({ src: imageUrl, sizes: size }));
}

// Client-side resolve cache so the same track never hits the API twice
const resolveCache = new Map<string, { uri: string | null; imageUrl?: string | null; durationMs?: number }>();

export default function PlayerBar() {
  const { data: session } = useSession();
  const sessionError = (session as { error?: string } | null)?.error;
  const {
    currentTrack,
    queue,
    queueIndex,
    pendingIndex,
    isPlaying,
    isTransitioning,
    progressMs,
    durationMs,
    isPlayerReady,
    sdkError,
    repeatMode,
    shuffleEnabled,
    crossfadeEnabled,
    crossfadeSeconds,
    volume,
    endedToken,
    isPlayerExpanded: expanded,
    isQueueOpen,
    sleepTimerEndsAt,
    initializePlayer,
    togglePlay,
    playIndex,
    updateTrackUri,
    seek,
    stop,
    setRepeatMode,
    toggleShuffle,
    setCrossfadeEnabled,
    setCrossfadeSeconds,
    setVolume,
    setSleepTimer,
    getNextIndex,
    getPrevIndex,
  } = usePlayerStore();

  const { load: loadLikes, songUris, toggleSong } = useLikesStore();
  const { toast } = useToastStore();
  const isLiked = currentTrack?.uri ? songUris.has(currentTrack.uri) : false;

  const handleLike = () => {
    if (!currentTrack?.uri) return;
    toggleSong({ uri: currentTrack.uri, name: currentTrack.name, image: currentTrack.image, artist: currentTrack.artist });
  };

  const [fetching, setFetching] = useState(false);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [modalTrack, setModalTrack] = useState<{ name: string; uri: string; image?: string | null; artist?: string | null } | null>(null);
  const [resolvingAdd, setResolvingAdd] = useState(false);
  const fetchingRef = useRef(false);
  const crossfadeGuardRef = useRef<string | null>(null);

  const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  const fadePlayerVolumeTransient = useCallback(async (from: number, to: number, durationMs: number) => {
    const player = usePlayerStore.getState().player;
    if (!player) return;
    const steps = 6;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const value = from + (to - from) * t;
      await player.setVolume(Math.max(0, Math.min(1, value))).catch(() => {});
      await wait(Math.max(20, Math.floor(durationMs / steps)));
    }
  }, []);

  const playWithTransition = useCallback(async (index: number, smooth = false) => {
    if (!smooth || !crossfadeEnabled || crossfadeSeconds <= 0) {
      playIndex(index);
      return;
    }

    const baseVolume = usePlayerStore.getState().volume;
    const lowVolume = Math.max(0.12, baseVolume * 0.35);
    await fadePlayerVolumeTransient(baseVolume, lowVolume, 260);
    playIndex(index);
    await wait(120);
    await fadePlayerVolumeTransient(lowVolume, baseVolume, 520);
  }, [crossfadeEnabled, crossfadeSeconds, fadePlayerVolumeTransient, playIndex]);

  const handleAddToPlaylist = useCallback(async () => {
    if (!currentTrack) return;
    if (currentTrack.uri) {
      setModalTrack({ name: currentTrack.name, uri: currentTrack.uri, image: currentTrack.image, artist: currentTrack.artist });
      return;
    }
    setResolvingAdd(true);
    try {
      const cacheKey = `${currentTrack.name}::${currentTrack.artist}`;
      const cached = resolveCache.get(cacheKey);
      if (cached?.uri) {
        setModalTrack({ name: currentTrack.name, uri: cached.uri });
        return;
      }
      const res = await fetch(
        `/api/spotify/resolve?track=${encodeURIComponent(currentTrack.name)}&artist=${encodeURIComponent(currentTrack.artist)}`
      );
      const data = await res.json();
      if (data.uri) {
        resolveCache.set(cacheKey, data);
        setModalTrack({ name: currentTrack.name, uri: data.uri });
      }
    } finally {
      setResolvingAdd(false);
    }
  }, [currentTrack]);

  useEffect(() => { loadLikes(); }, [loadLikes]);

  useEffect(() => {
    if (!session?.accessToken || sessionError) return;
    initializePlayer(session.accessToken);
  }, [session?.accessToken, sessionError, initializePlayer]);

  const fetchAndPlay = useCallback(async (index: number, options?: { smooth?: boolean }) => {
    if (index < 0 || index >= queue.length || fetchingRef.current) return;
    const track = queue[index];

    if (track.uri !== undefined) {
      await playWithTransition(index, options?.smooth ?? false);
      return;
    }

    // Check client-side cache first
    const cacheKey = `${track.name}::${track.artist}`;
    const cached = resolveCache.get(cacheKey);
    if (cached !== undefined) {
      updateTrackUri(index, cached.uri, cached.imageUrl, cached.durationMs);
      await playWithTransition(index, options?.smooth ?? false);
      return;
    }

    fetchingRef.current = true;
    setFetching(true);
    try {
      const res = await fetch(
        `/api/spotify/resolve?track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(track.artist)}`
      );
      const data = await res.json();
      resolveCache.set(cacheKey, data);
      updateTrackUri(index, data.uri ?? null, data.imageUrl, data.durationMs ?? undefined);
      await playWithTransition(index, options?.smooth ?? false);
    } finally {
      fetchingRef.current = false;
      setFetching(false);
    }
  }, [playWithTransition, queue, updateTrackUri]);

  const handleNextTrack = useCallback(() => {
    const state = usePlayerStore.getState();
    const next = state.getNextIndex();
    if (next === null || next === state.queueIndex) return;
    void fetchAndPlay(next);
  }, [fetchAndPlay]);

  const handlePrevTrack = useCallback(() => {
    const state = usePlayerStore.getState();
    const prev = state.getPrevIndex();
    if (prev === null || prev === state.queueIndex) return;
    void fetchAndPlay(prev);
  }, [fetchAndPlay]);

  const handlePlayPause = useCallback(async () => {
    await togglePlay();
  }, [togglePlay]);

  const handleQueuePlayIndex = useCallback((index: number) => {
    usePlayerStore.setState({ isPlayerExpanded: true, isQueueOpen: false });
    void fetchAndPlay(index);
    return true;
  }, [fetchAndPlay]);

  useEffect(() => {
    if (!endedToken) return;
    const nextIndex = getNextIndex();
    if (nextIndex === null) return;
    fetchAndPlay(nextIndex);
  }, [endedToken, fetchAndPlay, getNextIndex]);

  useEffect(() => {
    crossfadeGuardRef.current = null;
  }, [queueIndex, currentTrack?.uri]);

  useEffect(() => {
    if (!crossfadeEnabled || !isPlaying || isTransitioning || durationMs <= 0 || progressMs <= 0) return;
    const nextIndex = getNextIndex();
    if (nextIndex === null || nextIndex === queueIndex) return;

    const remainingMs = durationMs - progressMs;
    const thresholdMs = crossfadeSeconds * 1000;
    if (remainingMs > thresholdMs || remainingMs <= 250) return;

    const guardKey = `${queueIndex}:${currentTrack?.uri ?? currentTrack?.name}:${nextIndex}`;
    if (crossfadeGuardRef.current === guardKey) return;
    crossfadeGuardRef.current = guardKey;
    fetchAndPlay(nextIndex, { smooth: true });
  }, [
    crossfadeEnabled,
    crossfadeSeconds,
    currentTrack?.name,
    currentTrack?.uri,
    durationMs,
    fetchAndPlay,
    getNextIndex,
    isPlaying,
    isTransitioning,
    progressMs,
    queueIndex,
  ]);

  // Advance progress locally every 500 ms while playing so the bar moves
  // smoothly between infrequent SDK state-change events.
  // Also keeps MediaSession position state in sync for the OS seek bar.
  useEffect(() => {
    if (!isPlaying || durationMs <= 0) return;
    const id = setInterval(() => {
      usePlayerStore.setState((s) => {
        if (!s.isPlaying || s.durationMs <= 0) return s;
        const next = Math.min(s.progressMs + 500, s.durationMs);
        if (typeof navigator !== "undefined" && "mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
          try {
            navigator.mediaSession.setPositionState({
              duration: s.durationMs / 1000,
              playbackRate: 1,
              position: next / 1000,
            });
          } catch {}
        }
        return { progressMs: next };
      });
    }, 500);
    return () => clearInterval(id);
  }, [isPlaying, durationMs]);

  // Media Session API — drives the OS lock-screen / notification player
  // with track metadata, artwork, and prev/next/play/pause/seek actions.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const artwork = buildMediaArtwork(currentTrack.image);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.name || "Now Playing",
      artist: currentTrack.artist || APP_NAME,
      album: APP_NAME,
      artwork,
    });
  }, [currentTrack]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => {
      Promise.resolve(usePlayerStore.getState().resumePlayback()).catch(() => {});
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      Promise.resolve(usePlayerStore.getState().pausePlayback()).catch(() => {});
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      handlePrevTrack();
    });
    navigator.mediaSession.setActionHandler("nexttrack", handleNextTrack);
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) {
        const { durationMs: dur } = usePlayerStore.getState();
        if (dur > 0) usePlayerStore.getState().seek(details.seekTime / (dur / 1000));
      }
    });
    return () => {
      (["play", "pause", "previoustrack", "nexttrack", "seekto"] as MediaSessionAction[]).forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch {}
      });
    };
  }, [handleNextTrack, handlePrevTrack]);

  // Sleep timer countdown
  useEffect(() => {
    if (!sleepTimerEndsAt) { setTimerRemaining(null); return; }
    const tick = () => {
      const diff = sleepTimerEndsAt - Date.now();
      if (diff <= 0) {
        usePlayerStore.getState().togglePlay();
        usePlayerStore.getState().setSleepTimer(null);
        setTimerRemaining(null);
        return;
      }
      const m = Math.floor(diff / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimerRemaining(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sleepTimerEndsAt]);

  const playerHistoryPushedRef = useRef(false);
  const nowPlayingScrollRef = useRef<HTMLDivElement | null>(null);
  const sheetTouchStartY = useRef(0);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  const collapseNowPlaying = useCallback(() => {
    usePlayerStore.setState({ isPlayerExpanded: false });
    setSheetOffset(0);
    setIsDraggingSheet(false);
    if (playerHistoryPushedRef.current) {
      playerHistoryPushedRef.current = false;
      window.history.back();
    }
  }, []);

  const expandNowPlaying = useCallback(() => {
    if (!playerHistoryPushedRef.current) {
      window.history.pushState({ jkPlayer: true }, "");
      playerHistoryPushedRef.current = true;
    }
    usePlayerStore.setState({ isPlayerExpanded: true });
  }, []);

  useEffect(() => {
    if (!expanded) return;

    if (!playerHistoryPushedRef.current) {
      window.history.pushState({ jkPlayer: true }, "");
      playerHistoryPushedRef.current = true;
    }

    const onPopState = () => {
      playerHistoryPushedRef.current = false;
      usePlayerStore.setState({ isPlayerExpanded: false });
      setSheetOffset(0);
      setIsDraggingSheet(false);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [expanded]);

  if (sdkError && !currentTrack) {
    return (
      <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40 border-t border-white/[0.07] px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: "rgba(7,5,18,0.97)", backdropFilter: "blur(20px)" }}>
        <p className="text-[#E8282B] text-sm truncate">{sdkError}</p>
        {sdkError.includes("Premium") || sdkError.includes("auth") ? null : (
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="shrink-0 text-xs bg-[#E8282B] text-white px-3 py-1.5 rounded-xl font-medium">
            Re-login
          </button>
        )}
      </div>
    );
  }

  if (!currentTrack) return null;

  const prevIndex = getPrevIndex();
  const nextIndex = getNextIndex();
  const progressRatio = durationMs > 0 ? Math.min(progressMs / durationMs, 1) : 0;
  const noTrackUri = currentTrack.uri === null;
  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;
  const pendingTrack = pendingIndex !== null ? queue[pendingIndex] ?? null : null;

  // Play button state — keep play tappable when paused so users can start playback
  const playBusy = fetching || (isTransitioning && isPlaying);
  const playDisabled = noTrackUri || playBusy;

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const cycleRepeatMode = () => {
    if (repeatMode === "off") { setRepeatMode("all"); return; }
    if (repeatMode === "all") { setRepeatMode("one"); return; }
    setRepeatMode("off");
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - rect.left) / rect.width);
  };

  const onSheetTouchStart = (e: React.TouchEvent) => {
    const scrollTop = nowPlayingScrollRef.current?.scrollTop ?? 0;
    if (scrollTop > 8) return;
    sheetTouchStartY.current = e.touches[0]?.clientY ?? 0;
    setIsDraggingSheet(true);
  };

  const onSheetTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingSheet) return;
    const dy = (e.touches[0]?.clientY ?? 0) - sheetTouchStartY.current;
    if (dy > 0) setSheetOffset(dy);
  };

  const onSheetTouchEnd = () => {
    if (!isDraggingSheet) return;
    setIsDraggingSheet(false);
    setSheetOffset((offset) => {
      if (offset > 100) collapseNowPlaying();
      return 0;
    });
  };

  return (
    <>
      {/* ── Queue Sheet ── */}
      {isQueueOpen ? <QueueSheet onPlayIndex={handleQueuePlayIndex} /> : null}

      {/* ── Full-screen Now Playing (back / swipe down minimizes) ── */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            background: "var(--background)",
            transform: `translateY(${sheetOffset}px)`,
            transition: isDraggingSheet ? "none" : "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
          onTouchStart={onSheetTouchStart}
          onTouchMove={onSheetTouchMove}
          onTouchEnd={onSheetTouchEnd}
        >
          <div className="shrink-0 flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" aria-hidden />
          </div>

          <div className="px-4 pb-2 flex items-center justify-between shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Now Playing</p>
            <button
              type="button"
              onClick={collapseNowPlaying}
              className="rounded-xl p-2 text-white/30 hover:bg-white/[0.07] hover:text-white transition-colors"
              aria-label="Minimize player"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <div
            ref={nowPlayingScrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-5 scrollbar-hide"
          >
                {/* Album art */}
                <div className="relative mx-auto aspect-square w-full max-h-[min(44vh,360px)] overflow-hidden rounded-3xl shadow-2xl shadow-black/60 shrink-0"
                  style={{ background: "var(--card)" }}>
                  {currentTrack.image ? (
                    <Image src={currentTrack.image} alt={currentTrack.name} fill unoptimized className="object-cover" sizes="400px" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Music size={56} className="text-white/10" />
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="min-w-0 text-center">
                  <p className="truncate text-xl font-bold text-white">{currentTrack.name}</p>
                  <p className="mt-0.5 truncate text-sm text-white/40">{currentTrack.artist}</p>
                </div>

                {/* Switching indicator */}
                {(isTransitioning || (playBusy && !noTrackUri)) && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/25">Up Next</p>
                      <p className="text-sm text-white truncate">{pendingTrack?.name ?? currentTrack.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Loader2 size={13} className="animate-spin text-white/30" />
                      <span className="text-xs text-white/30">
                        {fetching ? "Loading track…" : isTransitioning ? "Switching…" : "Connecting…"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="group h-1.5 cursor-pointer rounded-full bg-white/[0.08]" onClick={handleSeek}>
                    <div className="relative h-full rounded-full bg-[#E8282B]" style={{ width: `${progressRatio * 100}%` }}>
                      <div className="absolute right-0 top-1/2 h-3.5 w-3.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs tabular-nums text-white/25">
                    <span>{formatTime(progressMs / 1000)}</span>
                    <span>{formatTime(durationMs / 1000)}</span>
                  </div>
                </div>

                {/* Track actions */}
                <div className="flex items-center justify-center gap-3">
                  <button onClick={handleLike} title={isLiked ? "Unlike" : "Like"}
                    className={`shrink-0 p-2.5 rounded-2xl transition-colors ${isLiked ? "text-[#E8282B] bg-[#E8282B]/10" : "text-white/30 hover:text-[#E8282B] hover:bg-[#E8282B]/10"}`}>
                    <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                  </button>
                  <button onClick={handleAddToPlaylist} disabled={resolvingAdd} title="Add to playlist"
                    className="shrink-0 p-2.5 rounded-2xl text-white/30 hover:text-[#E8282B] hover:bg-[#E8282B]/10 transition-colors disabled:opacity-40">
                    {resolvingAdd ? <Loader2 size={18} className="animate-spin" /> : <ListPlus size={18} />}
                  </button>
                  <button onClick={() => setShowLyrics(true)} title="Lyrics"
                    className={`shrink-0 p-2.5 rounded-2xl transition-colors ${showLyrics ? "text-[#E8282B] bg-[#E8282B]/10" : "text-white/30 hover:text-white hover:bg-white/[0.07]"}`}>
                    <MicVocal size={18} />
                  </button>
                </div>

                {/* Playback controls */}
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-5">
                  <button onClick={toggleShuffle} title="Shuffle"
                    className={`p-3 rounded-2xl transition-colors ${shuffleEnabled ? "text-[#E8282B] bg-[#E8282B]/10" : "text-white/25 hover:text-white hover:bg-white/[0.07]"}`}>
                    <Shuffle size={18} />
                  </button>
                  <button onClick={handlePrevTrack} title="Previous" disabled={isTransitioning}
                    className="p-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/[0.07] transition-colors">
                    <SkipBack size={22} fill="currentColor" />
                  </button>
                  <button onClick={handlePlayPause} disabled={playDisabled || isTransitioning} title={isPlaying ? "Pause" : "Play"}
                    className="btn-red p-5 rounded-full active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                    {playBusy
                      ? <Loader2 size={24} className="text-white animate-spin" />
                      : isPlaying
                        ? <Pause size={24} fill="white" className="text-white" />
                        : <Play size={24} fill="white" className="text-white" />
                    }
                  </button>
                  <button onClick={handleNextTrack} title="Next" disabled={isTransitioning}
                    className="p-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/[0.07] transition-colors">
                    <SkipForward size={22} fill="currentColor" />
                  </button>
                  <button onClick={cycleRepeatMode} title="Repeat"
                    className={`p-3 rounded-2xl transition-colors ${repeatMode !== "off" ? "text-[#E8282B] bg-[#E8282B]/10" : "text-white/25 hover:text-white hover:bg-white/[0.07]"}`}>
                    <RepeatIcon size={18} />
                  </button>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => { collapseNowPlaying(); usePlayerStore.setState({ isQueueOpen: true }); }} title="Queue"
                      className="shrink-0 p-2.5 rounded-2xl text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors">
                      <ListOrdered size={18} />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowTimerPicker((v) => !v)}
                        title="Sleep timer"
                        className={`shrink-0 p-2.5 rounded-2xl transition-colors ${sleepTimerEndsAt ? "text-[#E8282B] bg-[#E8282B]/10" : "text-white/30 hover:text-white hover:bg-white/[0.07]"}`}
                      >
                        <Timer size={18} />
                      </button>
                      {timerRemaining && (
                        <span className="absolute -top-1 -right-1 text-[9px] font-bold text-[#E8282B] bg-black/80 px-1 rounded-full leading-tight">
                          {timerRemaining}
                        </span>
                      )}
                      {showTimerPicker && (
                        <div className="absolute bottom-full right-0 mb-2 rounded-2xl border border-white/[0.08] p-3 shadow-2xl z-10 w-44"
                          style={{ background: "var(--surface)" }}>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Sleep Timer</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[15, 30, 45, 60].map((m) => (
                              <button key={m} onClick={() => { setSleepTimer(m); setShowTimerPicker(false); }}
                                className={`py-2 rounded-xl text-xs font-medium transition-colors ${sleepTimerEndsAt ? "bg-[#E8282B] text-white" : "text-white/70 hover:bg-white/[0.12]"}`}
                                style={!sleepTimerEndsAt ? { background: "rgba(255,255,255,0.07)" } : {}}>
                                {m}m
                              </button>
                            ))}
                          </div>
                          {sleepTimerEndsAt && (
                            <button onClick={() => { setSleepTimer(null); setShowTimerPicker(false); }}
                              className="mt-2 w-full py-1.5 rounded-xl text-xs text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors">
                              Cancel Timer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {showLyrics && (
                    <div
                      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
                      onClick={() => setShowLyrics(false)}
                    >
                      <div
                        className="relative w-full max-w-lg max-h-[85vh] rounded-3xl border border-white/[0.08] flex flex-col overflow-hidden shadow-2xl"
                        style={{ background: "rgba(15,8,10,0.98)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
                          <div className="min-w-0 pr-3">
                            <p className="text-sm font-semibold text-white truncate">{currentTrack.name}</p>
                            <p className="text-xs text-white/40 truncate">{currentTrack.artist}</p>
                          </div>
                          <button
                            onClick={() => setShowLyrics(false)}
                            className="shrink-0 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors"
                            aria-label="Close lyrics"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        {/* Lyrics */}
                        <div className="flex flex-col flex-1 overflow-hidden px-2 py-2">
                          <LyricsPanel track={currentTrack} progressMs={progressMs} fullscreen />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-center text-xs text-white/20 shrink-0">{Math.max(queueIndex + 1, 1)} / {queue.length} in queue</p>

                <SimilarMusicSection
                  key={`${currentTrack.uri ?? ""}::${currentTrack.name}::${currentTrack.artist}`}
                  track={currentTrack}
                  variant="embedded"
                />
          </div>
        </div>
      )}

      {/* ── Compact bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: "rgba(9,3,5,0.97)", backdropFilter: "blur(28px)" }}>

        {/* Progress bar */}
        <div className="h-[3px] cursor-pointer group relative" style={{ background: "rgba(255,255,255,0.06)" }} onClick={handleSeek}>
          <div className="h-full transition-all relative" style={{ width: `${progressRatio * 100}%`, background: "linear-gradient(90deg, #c62828, #E8282B, #ff5252)" }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md shadow-[#E8282B]/40" />
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 h-[72px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">

          {/* Artwork + track info */}
          <button
            onClick={expandNowPlaying}
            className="flex items-center gap-3 min-w-0 flex-1 text-left group/info"
            title="Open player"
          >
            <div className="relative w-11 h-11 shrink-0 rounded-2xl overflow-hidden shadow-lg shadow-black/40">
              {currentTrack.image
                ? <Image src={currentTrack.image} alt={currentTrack.name} fill unoptimized className="object-cover" sizes="44px" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--card)" }}><Music size={16} className="text-white/25" /></div>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate leading-snug group-hover/info:text-[#E8282B]/90 transition-colors">{currentTrack.name}</p>
              <p className="text-white/40 text-xs truncate mt-0.5">
                {isTransitioning && pendingTrack ? `Switching to ${pendingTrack.name}...` : currentTrack.artist}
              </p>
            </div>
          </button>

          {/* Playback controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={toggleShuffle} title="Shuffle"
              className={`p-2 rounded-xl transition-colors ${shuffleEnabled ? "text-[#E8282B]" : "text-white/30 hover:text-white"}`}>
              <Shuffle size={16} />
            </button>
            <button onClick={handlePrevTrack} title="Previous" disabled={isTransitioning}
              className="p-2 rounded-xl text-white/40 hover:text-white transition-colors disabled:opacity-30">
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button onClick={handlePlayPause} disabled={playDisabled || isTransitioning}
              className="btn-red mx-1 p-3 rounded-full active:scale-95 disabled:opacity-40 transition-transform">
              {(!currentTrack || !isPlaying) && playBusy
                ? <Loader2 size={18} className="text-white animate-spin" />
                : isPlaying
                  ? <Pause size={18} fill="white" className="text-white" />
                  : <Play size={18} fill="white" className="text-white ml-0.5" />}
            </button>
            <button onClick={handleNextTrack} title="Next" disabled={isTransitioning}
              className="p-2 rounded-xl text-white/40 hover:text-white transition-colors disabled:opacity-30">
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button onClick={cycleRepeatMode} title={repeatMode === "one" ? "Repeat one" : repeatMode === "all" ? "Repeat all" : "Repeat off"}
              className={`p-2 rounded-xl transition-colors ${repeatMode !== "off" ? "text-[#E8282B]" : "text-white/30 hover:text-white"}`}>
              <RepeatIcon size={16} />
            </button>
            <button onClick={handleLike} title={isLiked ? "Unlike" : "Like"}
              className={`p-2 rounded-xl transition-colors ${isLiked ? "text-[#E8282B]" : "text-white/30 hover:text-[#E8282B]"}`}>
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <button onClick={handleAddToPlaylist} disabled={resolvingAdd} title="Add to playlist"
              className="p-2 rounded-xl text-[#E8282B]/50 hover:text-[#E8282B] hover:bg-[#E8282B]/10 transition-colors disabled:opacity-30">
              {resolvingAdd ? <Loader2 size={16} className="animate-spin" /> : <ListPlus size={16} />}
            </button>
            <button onClick={() => usePlayerStore.setState({ isQueueOpen: true })} title="Queue"
              className="p-2 rounded-xl text-white/25 hover:text-white hover:bg-white/[0.06] transition-colors">
              <ListOrdered size={16} />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <button onClick={() => setVolume(volume === 0 ? 0.5 : 0)} className="p-2 rounded-xl text-white/30 hover:text-white transition-colors">
                <VolumeIcon size={16} />
              </button>
              <input
                type="range" min={0} max={1} step={0.02} value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 rounded-full appearance-none cursor-pointer accent-[#E8282B]"
                style={{ background: `linear-gradient(to right, #E8282B ${volume * 100}%, rgba(255,255,255,0.12) ${volume * 100}%)` }}
              />
            </div>
            <button onClick={stop} title="Close"
              className="p-2 rounded-xl text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
              <X size={16} />
            </button>
          </div>

        </div>
      </div>

      {modalTrack && (
        <AddToPlaylistModal track={modalTrack} onClose={() => setModalTrack(null)} />
      )}
    </>
  );
}
