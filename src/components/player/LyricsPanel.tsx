"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlayableTrack } from "@/store/player";
import { LYRIC_TARGET_LANGUAGES } from "@/lib/translate";
import { useToastStore } from "@/store/toast";
import {
  ALargeSmall,
  Check,
  Copy,
  Languages,
  Loader2,
  MicVocal,
  Minus,
  Plus,
  TimerReset,
} from "lucide-react";

interface LrcLine {
  timeMs: number;
  text: string;
}

interface Props {
  track: PlayableTrack;
  progressMs: number;
  fullscreen?: boolean;
  /** Light / white panel styling (Now Playing lyrics modal) */
  light?: boolean;
  onSeekMs?: (ms: number) => void;
}

type FontSize = "sm" | "md" | "lg" | "xl";

const FONT_KEY = "jokerly-lyrics-font";
const OFFSET_KEY = "jokerly-lyrics-offset-ms";
const SING_KEY = "jokerly-lyrics-singalong";

const FONT_STEPS: FontSize[] = ["sm", "md", "lg", "xl"];

const ACTIVE_SIZE: Record<FontSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-3xl",
};

const NEAR_SIZE: Record<FontSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const FAR_SIZE: Record<FontSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const PLAIN_SIZE: Record<FontSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

function readStoredFont(): FontSize {
  if (typeof window === "undefined") return "md";
  const v = window.localStorage.getItem(FONT_KEY);
  return FONT_STEPS.includes(v as FontSize) ? (v as FontSize) : "md";
}

function readStoredOffset(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(window.localStorage.getItem(OFFSET_KEY));
  return Number.isFinite(n) ? Math.max(-5000, Math.min(5000, Math.round(n))) : 0;
}

function readStoredSingAlong(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(SING_KEY);
  return v !== "0";
}

function formatOffset(ms: number): string {
  if (ms === 0) return "0.0s";
  const sec = (ms / 1000).toFixed(1);
  return ms > 0 ? `+${sec}s` : `${sec}s`;
}

export default function LyricsPanel({ track, progressMs, fullscreen, light = false, onSeekMs }: Props) {
  const { toast } = useToastStore();
  const [originalSynced, setOriginalSynced] = useState<LrcLine[] | null>(null);
  const [originalPlain, setOriginalPlain] = useState<string | null>(null);
  const [displaySynced, setDisplaySynced] = useState<LrcLine[] | null>(null);
  const [displayPlain, setDisplayPlain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState("en");
  const [showingTranslation, setShowingTranslation] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [offsetMs, setOffsetMs] = useState(0);
  const [singAlong, setSingAlong] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const activeRef = useRef<HTMLParagraphElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const userScrollUntil = useRef(0);

  useEffect(() => {
    setFontSize(readStoredFont());
    setOffsetMs(readStoredOffset());
    setSingAlong(readStoredSingAlong());
  }, []);

  const resetDisplay = useCallback((synced: LrcLine[] | null, plain: string | null) => {
    setDisplaySynced(synced);
    setDisplayPlain(plain);
    setShowingTranslation(false);
    setTranslateError(null);
  }, []);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setOriginalSynced(null);
    setOriginalPlain(null);
    resetDisplay(null, null);

    const artist = track.artist.split(",")[0].trim();
    const params = new URLSearchParams({
      artist,
      track: track.name,
    });
    if (track.durationMs && track.durationMs > 0) {
      params.set("duration", String(Math.round(track.durationMs / 1000)));
    }
    const url = `/api/lyrics?${params.toString()}`;

    fetch(url)
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          syncedLines?: LrcLine[];
          plainText?: string;
          notFound?: boolean;
          error?: string;
        };
        if (!response.ok) {
          setNotFound(true);
          return;
        }
        if (data.notFound || data.error) {
          setNotFound(true);
          return;
        }
        if (data.syncedLines?.length) {
          setOriginalSynced(data.syncedLines);
          resetDisplay(data.syncedLines, null);
        } else if (data.plainText) {
          setOriginalPlain(data.plainText);
          resetDisplay(null, data.plainText);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [track.name, track.artist, track.durationMs, resetDisplay]);

  const handleShowOriginal = () => {
    resetDisplay(originalSynced, originalPlain);
  };

  const handleTranslate = async () => {
    if (!originalSynced?.length && !originalPlain) return;

    setTranslating(true);
    setTranslateError(null);

    try {
      const res = await fetch("/api/lyrics/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          originalSynced?.length
            ? { target: targetLang, lines: originalSynced.map((l) => l.text) }
            : { target: targetLang, plainText: originalPlain }
        ),
      });

      const data = (await res.json().catch(() => ({}))) as {
        lines?: string[];
        plainText?: string;
        error?: string;
      };

      if (!res.ok) {
        setTranslateError(data.error ?? "Translation failed");
        return;
      }

      if (originalSynced?.length && data.lines?.length) {
        setDisplaySynced(
          originalSynced.map((line, i) => ({
            timeMs: line.timeMs,
            text: data.lines?.[i] ?? line.text,
          }))
        );
        setDisplayPlain(null);
      } else if (data.plainText) {
        setDisplayPlain(data.plainText);
        setDisplaySynced(null);
      } else {
        setTranslateError("Translation returned no text");
        return;
      }

      setShowingTranslation(true);
    } catch {
      setTranslateError("Could not translate lyrics");
    } finally {
      setTranslating(false);
    }
  };

  const changeFont = (dir: -1 | 1) => {
    setFontSize((prev) => {
      const idx = FONT_STEPS.indexOf(prev);
      const next = FONT_STEPS[Math.max(0, Math.min(FONT_STEPS.length - 1, idx + dir))] ?? prev;
      window.localStorage.setItem(FONT_KEY, next);
      return next;
    });
  };

  const changeOffset = (delta: number) => {
    setOffsetMs((prev) => {
      const next = Math.max(-5000, Math.min(5000, prev + delta));
      window.localStorage.setItem(OFFSET_KEY, String(next));
      return next;
    });
  };

  const resetOffset = () => {
    setOffsetMs(0);
    window.localStorage.setItem(OFFSET_KEY, "0");
  };

  const toggleSingAlong = () => {
    setSingAlong((prev) => {
      const next = !prev;
      window.localStorage.setItem(SING_KEY, next ? "1" : "0");
      return next;
    });
  };

  const syncedLines = displaySynced;
  const plainText = displayPlain;
  const effectiveProgress = progressMs + offsetMs;

  const activeIdx = syncedLines
    ? syncedLines.reduce((best, line, i) => (line.timeMs <= effectiveProgress ? i : best), -1)
    : -1;

  useEffect(() => {
    if (!singAlong) return;
    if (Date.now() < userScrollUntil.current) return;
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeRef.current;
      const offset = el.offsetTop - container.offsetHeight / 2 + el.offsetHeight / 2;
      container.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, [activeIdx, singAlong]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast(`${label} copied`);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Could not copy");
    }
  };

  const handleCopyVerse = () => {
    if (syncedLines && activeIdx >= 0) {
      void copyText(syncedLines[activeIdx].text, "Verse");
      return;
    }
    if (plainText) {
      void copyText(plainText, "Lyrics");
    }
  };

  const handleCopyAll = () => {
    if (syncedLines?.length) {
      void copyText(syncedLines.map((l) => l.text).join("\n"), "Lyrics");
      return;
    }
    if (plainText) {
      void copyText(plainText, "Lyrics");
    }
  };

  const handleLineTap = (line: LrcLine) => {
    if (!onSeekMs) return;
    userScrollUntil.current = Date.now() + 2500;
    onSeekMs(Math.max(0, line.timeMs - offsetMs));
  };

  const langLabel =
    LYRIC_TARGET_LANGUAGES.find((l) => l.code === targetLang)?.label ?? targetLang;

  const hasContent = !loading && !notFound && (!!syncedLines?.length || !!plainText);

  const iconIdle = light
    ? "text-[#EF4444] hover:bg-[#EF4444]/10"
    : "text-white/40 hover:text-white hover:bg-white/[0.06]";
  const iconActive = light
    ? "bg-[#EF4444]/10 text-[#EF4444]"
    : "bg-white/[0.1] text-white";
  const muted = light ? "text-[#111827]/45" : "text-white/25";
  const soft = light ? "text-[#111827]/55" : "text-white/55";
  const strong = light ? "text-[#111827]" : "text-white";
  const nearText = light ? "text-[#111827]/60" : "text-white/55";
  const farText = light ? "text-[#111827]/35" : "text-white/25";
  const plainTextCls = light ? "text-[#111827]/75" : "text-white/70";
  const panelSoft = light
    ? "rounded-xl border-2 border-[#EF4444]/35 bg-[#EF4444]/[0.04] px-3 py-2.5 space-y-2.5"
    : "rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 space-y-2.5";
  const selectCls = light
    ? "min-w-0 max-w-[7.5rem] text-xs rounded-lg border-2 border-[#EF4444]/40 bg-white text-[#111827] px-2 py-1.5 outline-none focus:border-[#EF4444]"
    : "min-w-0 max-w-[7.5rem] text-xs rounded-lg border border-white/[0.08] bg-white/[0.06] text-white px-2 py-1.5 outline-none focus:border-[var(--accent)]/40";
  const inactiveChip = light
    ? "bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/15"
    : "bg-white/[0.06] text-white/55 hover:text-white";

  return (
    <div className={`flex flex-col min-h-0 ${fullscreen ? "flex-1 h-full" : ""}`}>
      {hasContent && (
        <div className={`shrink-0 space-y-2 mb-2 ${fullscreen ? "px-1" : ""}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSingAlong}
              className={`shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                singAlong ? "btn-accent text-white" : inactiveChip
              }`}
              title="Karaoke scroll + highlight"
            >
              Sing-along
            </button>
            <button
              type="button"
              onClick={() => setShowControls((v) => !v)}
              className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                showControls ? iconActive : iconIdle
              }`}
              title="Font & sync"
              aria-label="Font and sync controls"
            >
              <ALargeSmall size={14} />
            </button>
            <button
              type="button"
              onClick={handleCopyVerse}
              className={`shrink-0 p-1.5 rounded-lg transition-colors ${iconIdle}`}
              title={syncedLines ? "Copy current verse" : "Copy lyrics"}
              aria-label="Copy verse"
            >
              {copied ? <Check size={14} className="text-[#EF4444]" /> : <Copy size={14} />}
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 min-w-0">
              <Languages size={14} className={`shrink-0 ${light ? "text-[#EF4444]" : "text-white/35"}`} />
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className={selectCls}
                aria-label="Translation language"
              >
                {LYRIC_TARGET_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className={light ? "bg-white text-[#111827]" : "bg-zinc-900"}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleTranslate()}
              disabled={translating}
              className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg btn-accent text-white hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {translating ? "…" : "Translate"}
            </button>
            {showingTranslation && (
              <button
                type="button"
                onClick={handleShowOriginal}
                className={`shrink-0 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${iconIdle}`}
              >
                Original
              </button>
            )}
          </div>

          {showControls && (
            <div className={panelSoft}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] uppercase tracking-widest ${light ? "text-[#EF4444]/70" : "text-white/35"}`}>Font</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changeFont(-1)}
                    disabled={fontSize === "sm"}
                    className={`p-1.5 rounded-lg disabled:opacity-30 ${iconIdle}`}
                    aria-label="Smaller text"
                  >
                    <Minus size={12} />
                  </button>
                  <span className={`text-xs w-8 text-center uppercase ${soft}`}>{fontSize}</span>
                  <button
                    type="button"
                    onClick={() => changeFont(1)}
                    disabled={fontSize === "xl"}
                    className={`p-1.5 rounded-lg disabled:opacity-30 ${iconIdle}`}
                    aria-label="Larger text"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {syncedLines && (
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] uppercase tracking-widest ${light ? "text-[#EF4444]/70" : "text-white/35"}`}>Sync</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeOffset(-250)}
                      className={`p-1.5 rounded-lg ${iconIdle}`}
                      aria-label="Lyrics earlier"
                      title="Lyrics earlier"
                    >
                      <Minus size={12} />
                    </button>
                    <span className={`text-xs tabular-nums w-12 text-center ${soft}`}>
                      {formatOffset(offsetMs)}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeOffset(250)}
                      className={`p-1.5 rounded-lg ${iconIdle}`}
                      aria-label="Lyrics later"
                      title="Lyrics later"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={resetOffset}
                      className={`p-1.5 rounded-lg ${iconIdle}`}
                      title="Reset sync"
                      aria-label="Reset sync"
                    >
                      <TimerReset size={12} />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCopyAll}
                className={`w-full text-xs font-medium py-1.5 rounded-lg transition-colors ${iconIdle}`}
              >
                Copy all lyrics
              </button>
            </div>
          )}
        </div>
      )}

      {showingTranslation && !translateError && (
        <p className={`text-[10px] text-[#EF4444]/90 mb-2 ${fullscreen ? "px-1" : ""}`}>
          Translated to {langLabel}
        </p>
      )}

      {translateError && (
        <p className={`text-[10px] text-[#EF4444] mb-2 ${fullscreen ? "px-1" : ""}`}>
          {translateError}
        </p>
      )}

      {syncedLines && onSeekMs && hasContent && (
        <p className={`text-[10px] mb-1 ${muted} ${fullscreen ? "px-1" : ""}`}>
          Tap a line to jump · adjust Sync if timing is off
        </p>
      )}

      <div
        ref={containerRef}
        onScroll={() => {
          userScrollUntil.current = Date.now() + 2500;
        }}
        className={`overflow-y-auto rounded-2xl px-4 py-3 scrollbar-hide ${
          fullscreen
            ? `flex-1 min-h-0 ${light ? "border-2 border-[#EF4444]/30 bg-white" : ""}`
            : "card-light max-h-56 border border-black/5"
        } ${singAlong && syncedLines ? "space-y-5" : "space-y-3"}`}
        style={{ background: fullscreen ? "transparent" : "#000000" }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 size={14} className={`animate-spin ${light ? "text-[#EF4444]" : "text-white/30"}`} />
            <p className={`text-[11px] ${muted}`}>Loading lyrics…</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <MicVocal size={24} className={light ? "text-[#EF4444]/40" : "text-white/15"} />
            <p className={`text-xs ${muted}`}>No lyrics found</p>
          </div>
        )}

        {!loading &&
          syncedLines &&
          syncedLines.map((line, i) => {
            const isActive = i === activeIdx;
            const near = Math.abs(i - activeIdx) <= 2;
            return (
              <p
                key={i}
                ref={isActive ? activeRef : null}
                role={onSeekMs ? "button" : undefined}
                tabIndex={onSeekMs ? 0 : undefined}
                onClick={() => handleLineTap(line)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLineTap(line);
                  }
                }}
                className={`text-center leading-snug transition-all duration-300 ${
                  onSeekMs ? "cursor-pointer select-none" : ""
                } ${
                  isActive
                    ? `font-bold scale-[1.02] ${ACTIVE_SIZE[fontSize]} ${
                        singAlong
                          ? "text-[#EF4444]"
                          : strong
                      }`
                    : near
                      ? `${nearText} ${NEAR_SIZE[fontSize]}`
                      : `${farText} ${FAR_SIZE[fontSize]}`
                }`}
              >
                {line.text}
              </p>
            );
          })}

        {!loading && plainText && (
          <pre
            className={`whitespace-pre-wrap font-sans leading-relaxed ${plainTextCls} ${PLAIN_SIZE[fontSize]}`}
          >
            {plainText}
          </pre>
        )}
      </div>
    </div>
  );
}
