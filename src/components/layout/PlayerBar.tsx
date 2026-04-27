"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePlayerStore } from "@/store/player";
import { Play, Pause, SkipBack, SkipForward, X, Music } from "lucide-react";
import Image from "next/image";

function formatTime(seconds: number) {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PlayerBar() {
  const { currentTrack, queue, queueIndex, isPlaying, audio, togglePlay, playIndex, updateTrackPreview, stop } =
    usePlayerStore();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fetching, setFetching] = useState(false);
  const animRef = useRef<number>(0);

  useEffect(() => {
    setProgress(0);
    setDuration(0);
    if (!audio) return;

    const tick = () => {
      setProgress(audio.currentTime);
      setDuration(isFinite(audio.duration) ? audio.duration : 0);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [audio]);

  const fetchAndPlay = useCallback(async (index: number) => {
    if (index < 0 || index >= queue.length || fetching) return;
    const track = queue[index];

    if (track.previewUrl !== undefined) {
      playIndex(index);
      return;
    }

    setFetching(true);
    try {
      const res = await fetch(
        `/api/spotify/preview?track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(track.artist)}`
      );
      const data = await res.json();
      updateTrackPreview(index, data.previewUrl ?? null, data.imageUrl);
      // After updateTrackPreview, the store's queue is updated. playIndex reads from current store state.
      usePlayerStore.getState().playIndex(index);
    } finally {
      setFetching(false);
    }
  }, [queue, fetching, playIndex, updateTrackPreview]);

  if (!currentTrack) return null;

  const hasPrev = queueIndex > 0;
  const hasNext = queueIndex < queue.length - 1;
  const progressRatio = duration > 0 ? Math.min(progress / duration, 1) : 0;
  const noPreview = currentTrack.previewUrl === null;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    usePlayerStore.getState().seek((e.clientX - rect.left) / rect.width);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/98 backdrop-blur border-t border-zinc-800">
      {/* Progress bar */}
      <div
        className="h-1 bg-zinc-800 cursor-pointer group"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-red-500 relative group-hover:bg-red-400 transition-colors"
          style={{ width: `${progressRatio * 100}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
        {/* Track info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative w-12 h-12 shrink-0 shadow-lg">
            {currentTrack.image ? (
              <Image src={currentTrack.image} alt={currentTrack.name} fill unoptimized className="rounded-lg object-cover" sizes="48px" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Music size={18} className="text-zinc-600" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate leading-tight">{currentTrack.name}</p>
            <p className="text-zinc-400 text-xs truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => fetchAndPlay(queueIndex - 1)}
            disabled={!hasPrev || fetching}
            className="p-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous"
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={togglePlay}
            disabled={noPreview || fetching}
            className="p-2.5 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white" />}
          </button>

          <button
            onClick={() => fetchAndPlay(queueIndex + 1)}
            disabled={!hasNext || fetching}
            className="p-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Time + status */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {noPreview ? (
            <span className="text-zinc-600 text-xs">No preview</span>
          ) : (
            <span className="text-zinc-500 text-xs tabular-nums whitespace-nowrap">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          )}
          <button
            onClick={stop}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
