"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Wand2,
  Music,
  Loader2,
  ArrowRight,
  Clock,
  Disc3,
} from "lucide-react";
import { useToastStore } from "@/store/toast";
import { usePlayerStore } from "@/store/player";

type Mode = "magic" | "time-machine";

const ERAS = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s"] as const;

const MAGIC_EXAMPLES = [
  "A late-night driving playlist with synthwave and chill R&B",
  "Upbeat gym workout songs blending English Pop and Hindi Rap",
  "Cozy rainy day acoustic tracks from the 2010s",
  "High energy EDM for gaming sessions",
];

const TIME_EXAMPLES = [
  { seeds: "Levitating by Dua Lipa, As It Was by Harry Styles", era: "1960s" as const },
  { seeds: "Blinding Lights by The Weeknd", era: "1980s" as const },
  { seeds: "Bad Guy by Billie Eilish, Softcore by The Neighbourhood", era: "1970s" as const },
];

export default function MagicMixClient() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.toast);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);

  const [mode, setMode] = useState<Mode>("magic");
  const [prompt, setPrompt] = useState("");
  const [seeds, setSeeds] = useState("");
  const [era, setEra] = useState<(typeof ERAS)[number]>("1960s");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState("");

  const fillFromNowPlaying = () => {
    const fromQueue =
      queue.length > 0
        ? queue.slice(Math.max(0, queueIndex), Math.max(0, queueIndex) + 5)
        : [];
    const tracks =
      fromQueue.length > 0
        ? fromQueue
        : currentTrack
          ? [currentTrack]
          : [];
    if (tracks.length === 0) {
      showToast("Nothing playing — start a song first", "error");
      return;
    }
    setSeeds(tracks.map((t) => `${t.name} by ${t.artist}`).join(", "));
  };

  const handleMagicGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setProgressText("Consulting the AI music oracle...");

    try {
      setTimeout(() => setProgressText("Searching the catalog for perfect tracks..."), 1000);
      setTimeout(() => setProgressText("Compiling your magic mix..."), 2000);

      const res = await fetch("/api/magic-mix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate playlist");
      }

      showToast(`Created ✨ ${data.name} with ${data.trackCount} tracks!`);
      router.push(`/playlists?id=${encodeURIComponent(data.playlistId)}`);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Something went wrong generating the mix", "error");
      setIsGenerating(false);
      setProgressText("");
    }
  };

  const handleTimeTravel = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!seeds.trim()) return;

    setIsGenerating(true);
    setProgressText("Reading the vibe of your seeds...");

    try {
      setTimeout(() => setProgressText(`Scouting the ${era} for matching grooves...`), 1000);
      setTimeout(() => setProgressText("Building your Time Machine playlist..."), 2200);

      const res = await fetch("/api/time-machine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seeds: seeds.trim(), era }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to travel through time");
      }

      showToast(`Created ${data.name} with ${data.trackCount} tracks!`);
      router.push(`/playlists?id=${encodeURIComponent(data.playlistId)}`);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Time travel failed", "error");
      setIsGenerating(false);
      setProgressText("");
    }
  };

  return (
    <div className="flex flex-col h-full pt-4 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background:
              mode === "time-machine"
                ? "linear-gradient(135deg, #EF4444, #991B1B)"
                : "linear-gradient(135deg, #EF4444, #7C3AED)",
            boxShadow: "0 8px 24px rgba(239,68,68,0.25)",
          }}
        >
          {mode === "time-machine" ? (
            <Clock size={20} className="text-white" />
          ) : (
            <Sparkles size={20} className="text-white" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mode === "time-machine" ? "Time Machine" : "Magic Mix"}
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            {mode === "time-machine"
              ? "Same vibe, different decade."
              : "Describe your vibe, let AI curate the music."}
          </p>
        </div>
      </div>

      <div
        className="on-ink flex p-1 rounded-2xl border border-white/10 mb-6"
        style={{ background: "var(--card)" }}
        role="tablist"
        aria-label="Mix mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "magic"}
          disabled={isGenerating}
          onClick={() => setMode("magic")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
            mode === "magic" ? "btn-nav-active text-white" : "text-white/50 hover:text-white"
          }`}
        >
          <Wand2 size={14} /> Magic Mix
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "time-machine"}
          disabled={isGenerating}
          onClick={() => setMode("time-machine")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
            mode === "time-machine" ? "btn-nav-active text-white" : "text-white/50 hover:text-white"
          }`}
        >
          <Clock size={14} /> Time Machine
        </button>
      </div>

      {mode === "magic" ? (
        <form onSubmit={handleMagicGenerate} className="mb-8">
          <div className="relative group">
            <div
              className="relative rounded-3xl p-2 flex flex-col border border-white/10 transition-colors"
              style={{ background: "var(--card)" }}
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="E.g., A focused coding session playlist with lofi beats and no vocals..."
                className="w-full bg-transparent resize-none h-28 p-4 text-white placeholder:text-white/25 focus:outline-none disabled:opacity-50"
                maxLength={300}
              />
              <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-white/[0.06]">
                <span className="text-[10px] font-medium text-white/30">{prompt.length}/300</span>
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="btn-accent flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      Create Mix
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handleTimeTravel} className="mb-8 space-y-4">
          <div
            className="rounded-3xl p-2 flex flex-col border border-white/10"
            style={{ background: "var(--card)" }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                Seed songs
              </label>
              <button
                type="button"
                onClick={fillFromNowPlaying}
                disabled={isGenerating}
                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:text-[var(--accent-bright)] disabled:opacity-40 transition-colors"
              >
                <Disc3 size={12} /> Use now playing
              </button>
            </div>
            <textarea
              value={seeds}
              onChange={(e) => setSeeds(e.target.value)}
              disabled={isGenerating}
              placeholder="Levitating by Dua Lipa, As It Was by Harry Styles"
              className="w-full bg-transparent resize-none h-24 px-4 pb-3 text-white placeholder:text-white/25 focus:outline-none disabled:opacity-50"
              maxLength={500}
            />
            <div className="px-3 pb-2 pt-1 border-t border-white/[0.06]">
              <span className="text-[10px] font-medium text-white/30">{seeds.length}/500</span>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 mb-2 px-1">
              Target era
            </p>
            <div className="flex flex-wrap gap-2">
              {ERAS.map((e) => (
                <button
                  key={e}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setEra(e)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    era === e
                      ? "btn-nav-active text-white"
                      : "on-ink text-white/50 border border-white/10 hover:text-white"
                  }`}
                  style={era !== e ? { background: "var(--card)" } : undefined}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!seeds.trim() || isGenerating}
              className="btn-accent flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Traveling...
                </>
              ) : (
                <>
                  <Clock size={16} />
                  Travel
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {isGenerating ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[var(--accent)]/30 blur-2xl rounded-full animate-pulse" />
            <div
              className="w-20 h-20 rounded-full border border-[var(--accent)]/30 flex items-center justify-center relative z-10"
              style={{ background: "var(--card)" }}
            >
              {mode === "time-machine" ? (
                <Clock size={32} className="text-[var(--accent)] animate-pulse" />
              ) : (
                <Sparkles size={32} className="text-[var(--accent)] animate-pulse" />
              )}
            </div>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">{progressText}</h3>
          <p className="text-sm text-white/40 text-center max-w-xs">
            {mode === "time-machine"
              ? "Matching tempo and energy across decades..."
              : "Finding the perfect tracks and building your playlist..."}
          </p>
        </div>
      ) : mode === "magic" ? (
        <div>
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Music size={14} />
            Try these prompts
          </h3>
          <div className="flex flex-col gap-2">
            {MAGIC_EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="on-ink text-left w-full p-4 rounded-2xl border border-white/[0.06] hover:border-white/15 transition-colors flex items-center justify-between group"
                style={{ background: "var(--card)" }}
              >
                <span className="text-sm text-white/70 group-hover:text-white transition-colors line-clamp-1 pr-4">
                  {ex}
                </span>
                <ArrowRight
                  size={14}
                  className="text-white/30 group-hover:text-[var(--accent)] transition-colors shrink-0 -translate-x-2 group-hover:translate-x-0"
                />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock size={14} />
            Try these trips
          </h3>
          <div className="flex flex-col gap-2">
            {TIME_EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  setSeeds(ex.seeds);
                  setEra(ex.era);
                }}
                className="on-ink text-left w-full p-4 rounded-2xl border border-white/[0.06] hover:border-white/15 transition-colors group"
                style={{ background: "var(--card)" }}
              >
                <p className="text-sm text-white/70 group-hover:text-white transition-colors line-clamp-2">
                  {ex.seeds}
                </p>
                <p className="text-[11px] text-[var(--accent)] mt-1.5 font-semibold">{ex.era}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
