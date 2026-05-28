"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlayableTrack } from "@/store/player";
import {
  googleTranslateUrl,
  LYRIC_TRANSLATE_LANGUAGES,
  type LyricTranslateLang,
} from "@/lib/translate";
import { ExternalLink, Languages, Loader2, MicVocal } from "lucide-react";

interface LrcLine {
  timeMs: number;
  text: string;
}

interface Props {
  track: PlayableTrack;
  progressMs: number;
  fullscreen?: boolean;
}

export default function LyricsPanel({ track, progressMs, fullscreen }: Props) {
  const [originalSynced, setOriginalSynced] = useState<LrcLine[] | null>(null);
  const [originalPlain, setOriginalPlain] = useState<string | null>(null);
  const [displaySynced, setDisplaySynced] = useState<LrcLine[] | null>(null);
  const [displayPlain, setDisplayPlain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<LyricTranslateLang>("en");
  const [showTranslated, setShowTranslated] = useState(false);
  const activeRef = useRef<HTMLParagraphElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setTranslateError(null);
    setShowTranslated(false);
    setOriginalSynced(null);
    setOriginalPlain(null);
    setDisplaySynced(null);
    setDisplayPlain(null);
    const artist = track.artist.split(",")[0].trim();
    const url = `/api/lyrics?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track.name)}`;

    fetch(url)
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          syncedLines?: LrcLine[];
          plainText?: string;
          notFound?: boolean;
        };
        if (!response.ok || data.notFound) {
          setNotFound(true);
          return;
        }
        if (data.syncedLines?.length) {
          setOriginalSynced(data.syncedLines);
          setDisplaySynced(data.syncedLines);
        } else if (data.plainText) {
          setOriginalPlain(data.plainText);
          setDisplayPlain(data.plainText);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [track.name, track.artist]);

  const runTranslation = useCallback(async (lang: LyricTranslateLang = targetLang) => {
    if (!originalSynced?.length && !originalPlain) return;

    setTranslating(true);
    setTranslateError(null);

    try {
      if (originalSynced?.length) {
        const lines = originalSynced.map((l) => l.text);
        const res = await fetch("/api/lyrics/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines, targetLang: lang }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          lines?: string[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(
            data.error ??
              (res.status === 422
                ? "Could not translate to this language. Try Google Translate (link)."
                : "Translation failed")
          );
        }

        const translated = data.lines ?? lines;
        setDisplaySynced(
          originalSynced.map((line, i) => ({
            timeMs: line.timeMs,
            text: translated[i] ?? line.text,
          }))
        );
      } else if (originalPlain) {
        const res = await fetch("/api/lyrics/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: originalPlain, targetLang: lang }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          text?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(
            data.error ??
              (res.status === 422
                ? "Could not translate to this language. Try Google Translate (link)."
                : "Translation failed")
          );
        }
        setDisplayPlain(data.text ?? originalPlain);
      }

      setShowTranslated(true);
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : "Could not translate");
    } finally {
      setTranslating(false);
    }
  }, [originalPlain, originalSynced, targetLang]);

  const showOriginal = useCallback(() => {
    setShowTranslated(false);
    setTranslateError(null);
    if (originalSynced) setDisplaySynced(originalSynced);
    if (originalPlain) setDisplayPlain(originalPlain);
  }, [originalPlain, originalSynced]);

  const handleTranslateToggle = () => {
    if (showTranslated) {
      showOriginal();
      return;
    }
    void runTranslation();
  };

  const activeIdx = displaySynced
    ? displaySynced.reduce((best, line, i) => (line.timeMs <= progressMs ? i : best), -1)
    : -1;

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeRef.current;
      const offset = el.offsetTop - container.offsetHeight / 2 + el.offsetHeight / 2;
      container.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, [activeIdx]);

  const fullLyricsText =
    originalPlain ??
    originalSynced?.map((l) => l.text).join("\n") ??
    "";

  const langLabel =
    LYRIC_TRANSLATE_LANGUAGES.find((l) => l.code === targetLang)?.label ?? targetLang;

  return (
    <div className={`flex flex-col min-h-0 ${fullscreen ? "flex-1 h-full" : ""}`}>
      {!loading && !notFound && (
        <div
          className={`shrink-0 flex flex-wrap items-center gap-2 border-b border-white/[0.06] ${
            fullscreen ? "px-3 py-3" : "px-1 pb-3 mb-2"
          }`}
        >
          <Languages size={16} className="text-[#E8282B] shrink-0" />
          <select
            value={targetLang}
            onChange={(e) => {
              const lang = e.target.value as LyricTranslateLang;
              setTargetLang(lang);
              if (showTranslated) void runTranslation(lang);
            }}
            className="flex-1 min-w-[120px] text-xs rounded-xl px-3 py-2 text-white border border-white/[0.1] bg-white/[0.06] focus:outline-none focus:border-[#E8282B]/40"
            aria-label="Translation language"
          >
            {LYRIC_TRANSLATE_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-[#161014]">
                {lang.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleTranslateToggle}
            disabled={translating}
            className="shrink-0 text-xs font-semibold px-3 py-2 rounded-xl bg-[#E8282B]/15 text-[#E8282B] hover:bg-[#E8282B]/25 disabled:opacity-50 transition-colors"
          >
            {translating ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Translating…
              </span>
            ) : showTranslated ? (
              "Original"
            ) : (
              "Translate"
            )}
          </button>
          {fullLyricsText && (
            <a
              href={googleTranslateUrl(fullLyricsText, targetLang)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Open in Google Translate"
              aria-label="Open in Google Translate"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      {showTranslated && !translating && (
        <p className={`text-[10px] text-white/30 shrink-0 ${fullscreen ? "px-3 pb-1" : "pb-1"}`}>
          Translated to {langLabel}
        </p>
      )}

      {translateError && (
        <p className="text-xs text-[#E8282B]/90 px-1 pb-2 shrink-0">{translateError}</p>
      )}

      <div
        ref={containerRef}
        className={`overflow-y-auto rounded-2xl px-4 py-3 space-y-3 scrollbar-hide flex-1 min-h-0 ${
          fullscreen ? "h-0" : "max-h-56"
        }`}
        style={{ background: fullscreen ? "transparent" : "var(--card)" }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 size={18} className="animate-spin text-white/30" />
            <p className="text-[11px] text-white/25">Loading lyrics…</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <MicVocal size={24} className="text-white/15" />
            <p className="text-xs text-white/30">No lyrics found</p>
          </div>
        )}

        {!loading &&
          displaySynced &&
          displaySynced.map((line, i) => (
            <p
              key={i}
              ref={i === activeIdx ? activeRef : null}
              className={`text-center leading-snug transition-all duration-300 ${
                i === activeIdx
                  ? `font-bold ${fullscreen ? "text-white text-xl" : "text-white text-base"}`
                  : Math.abs(i - activeIdx) <= 2
                    ? `${fullscreen ? "text-white/65 text-base" : "text-white/40 text-sm"}`
                    : `${fullscreen ? "text-white/35 text-sm" : "text-white/20 text-sm"}`
              }`}
            >
              {line.text}
            </p>
          ))}

        {!loading && displayPlain && (
          <pre
            className={`whitespace-pre-wrap font-sans leading-relaxed ${
              fullscreen ? "text-white/75 text-base" : "text-white/60 text-sm"
            }`}
          >
            {displayPlain}
          </pre>
        )}
      </div>
    </div>
  );
}
