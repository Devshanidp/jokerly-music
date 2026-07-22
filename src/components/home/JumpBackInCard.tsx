"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Music, Play, RotateCcw } from "lucide-react";
import { usePlayerStore } from "@/store/player";
import {
  clearListeningContext,
  readListeningContext,
  type ListeningContext,
} from "@/lib/listening-context";

function formatTime(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function JumpBackInCard() {
  const {
    currentTrack,
    queue,
    queueIndex,
    progressMs,
    durationMs,
    isPlaying,
    setQueueAndPlay,
    seek,
    resumePlayback,
  } = usePlayerStore();
  const [stored, setStored] = useState<ListeningContext | null>(null);

  useEffect(() => {
    setStored(readListeningContext());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "jokerly-jump-back-v1") setStored(readListeningContext());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Prefer live paused session; fall back to saved context
  const live: ListeningContext | null =
    currentTrack && queue.length > 0
      ? {
          queue,
          queueIndex: Math.max(0, queueIndex),
          progressMs,
          durationMs,
          updatedAt: Date.now(),
        }
      : null;

  const ctx = live ?? stored;
  if (!ctx?.queue?.length) return null;

  // Hide while actively playing — user is already in it
  if (isPlaying && live) return null;

  const index = Math.max(0, Math.min(ctx.queueIndex, ctx.queue.length - 1));
  const track = ctx.queue[index];
  if (!track) return null;

  const dur = ctx.durationMs || track.durationMs || 0;
  const pos = Math.min(ctx.progressMs || 0, dur || ctx.progressMs || 0);
  const ratio = dur > 0 ? Math.min(1, pos / dur) : 0;
  const sameSession =
    !!live &&
    live.queue[live.queueIndex]?.uri === track.uri &&
    live.queue[live.queueIndex]?.name === track.name;

  const handlePlay = async () => {
    if (sameSession) {
      await resumePlayback();
      return;
    }
    await setQueueAndPlay(ctx.queue, index);
    if (pos > 1500 && dur > 0) {
      // Allow player to settle, then seek into the track
      window.setTimeout(() => {
        seek(Math.min(0.98, pos / dur));
      }, 450);
    }
  };

  const handleDismiss = () => {
    clearListeningContext();
    setStored(null);
  };

  return (
    <section className="space-y-2">
      <h3 className="text-white font-bold text-base flex items-center gap-2">
        <RotateCcw size={14} className="text-[var(--accent)]" /> Jump back in
      </h3>
      <button
        type="button"
        onClick={() => void handlePlay()}
        className="w-full rounded-3xl border border-white/[0.1] overflow-hidden text-left group relative"
        style={{ background: "linear-gradient(135deg, rgba(140,80,200,0.22), rgba(12,6,10,0.95))" }}
      >
        <div className="flex items-center gap-4 p-3.5 sm:p-4">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 shadow-lg ring-1 ring-white/10">
            {track.image ? (
              <Image
                src={track.image}
                alt={track.name}
                fill
                unoptimized
                sizes="96px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/[0.06]">
                <Music size={22} className="text-white/25" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/35 mb-0.5">
                {ctx.queue.length > 1 ? `${ctx.queue.length} in queue` : "Continue"}
              </p>
              <p className="text-white font-semibold text-base truncate leading-tight">{track.name}</p>
              <p className="text-white/45 text-xs truncate mt-0.5">{track.artist}</p>
            </div>

            {dur > 0 && (
              <div className="space-y-1">
                <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.max(2, ratio * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/30 tabular-nums">
                  {formatTime(pos)} / {formatTime(dur)}
                </p>
              </div>
            )}
          </div>

          <div className="shrink-0 w-12 h-12 rounded-full btn-accent flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
            <Play size={18} fill="white" className="text-white ml-0.5" />
          </div>
        </div>
      </button>
      {stored && !sameSession && (
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[10px] text-white/25 hover:text-white/50 transition-colors px-1"
        >
          Dismiss
        </button>
      )}
    </section>
  );
}
