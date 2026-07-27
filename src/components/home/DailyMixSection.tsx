"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarDays, Loader2, Music, Play } from "lucide-react";
import type { SimilarTrack } from "@/lib/similar-tracks";
import { PlayableTrack, usePlayerStore } from "@/store/player";

type DailyMix = {
  id: string;
  name: string;
  subtitle: string;
  image: string | null;
  trackCount: number;
  tracks: SimilarTrack[];
};

const CARD_THEMES = [
  "from-[#7f1d1d] via-[#be123c] to-[#fb7185]",
  "from-[#1e3a8a] via-[#2563eb] to-[#67e8f9]",
  "from-[#7c2d12] via-[#ea580c] to-[#fbbf24]",
];

function toPlayable(track: SimilarTrack): PlayableTrack {
  return {
    name: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    image: track.album?.images?.[0]?.url,
    uri: track.uri,
    durationMs: track.duration_ms,
  };
}

export default function DailyMixSection() {
  const { setQueueAndPlay } = usePlayerStore();
  const [mixes, setMixes] = useState<DailyMix[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayKey, setDayKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/music/daily-mix", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data: { mixes?: DailyMix[]; dayKey?: string }) => {
        if (cancelled) return;
        setMixes(data.mixes ?? []);
        setDayKey(data.dayKey ?? null);
      })
      .catch(() => {
        if (!cancelled) setMixes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="space-y-3">
        <h3 className="text-white font-bold text-base flex items-center gap-2">
          <CalendarDays size={14} className="text-[var(--accent)]" /> Daily Mix
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-36 w-44 shrink-0 rounded-3xl border border-white/[0.08] bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (mixes.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <CalendarDays size={14} className="text-[var(--accent)]" /> Daily Mix
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            {dayKey ? `Refreshes daily · ${dayKey}` : "Personalized for today"}
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {mixes.map((mix, index) => (
          <button
            key={mix.id}
            type="button"
            onClick={() => {
              const playables = mix.tracks.map(toPlayable).filter((track) => track.uri);
              if (playables.length === 0) return;
              void setQueueAndPlay(playables, 0);
            }}
            className={`relative h-36 w-44 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${CARD_THEMES[index % CARD_THEMES.length]} p-4 text-left shadow-xl shadow-black/25 transition-transform active:scale-[0.98]`}
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 flex h-full flex-col">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
                Daily Mix
              </p>
              <p className="mt-1 text-lg font-bold leading-tight text-white">{mix.name}</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/80">
                {mix.subtitle}
              </p>

              <div className="mt-auto flex items-center justify-between gap-2">
                <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/20 bg-black/20 shrink-0">
                  {mix.image ? (
                    <Image src={mix.image} alt="" fill unoptimized className="object-cover" sizes="44px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music size={16} className="text-white/50" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-white/75">
                    {mix.trackCount} tracks
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg">
                    <Play size={14} fill="currentColor" className="ml-0.5" />
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
