"use client";

import { useState, useRef, useEffect } from "react";
import { Bug, X, Trash2, Copy, ChevronDown } from "lucide-react";
import { useDebugLogStore, LogLevel } from "@/store/debugLog";
import { usePlayerStore } from "@/store/player";

const levelColor: Record<LogLevel, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

const levelBg: Record<LogLevel, string> = {
  info: "bg-blue-500/10",
  warn: "bg-yellow-500/10",
  error: "bg-red-500/10",
};

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const { entries, clearLogs } = useDebugLogStore();
  const isExpanded = usePlayerStore((s) => s.isPlayerExpanded);

  const visible = filter === "all" ? entries : entries.filter((e) => e.level === filter);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (open && autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries, open, autoScroll]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  }

  async function handleCopy() {
    const text = entries
      .map((e) => `[${formatTime(e.ts)}] [${e.level.toUpperCase()}] ${e.message}`)
      .join("\n");
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (isExpanded) return null;

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-3 z-[190] w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-opacity opacity-40 hover:opacity-100 active:opacity-100"
        style={{ background: "rgba(9,3,5,0.85)", border: "1px solid rgba(255,255,255,0.12)" }}
        aria-label="Open debug panel"
      >
        <Bug size={16} className="text-zinc-300" />
        {entries.some((e) => e.level === "error") && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>

      {/* Overlay panel */}
      {open && (
        <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: "rgba(0,0,0,0.85)" }}>
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{ background: "rgba(9,3,5,0.98)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Bug size={16} className="text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-200 flex-1">Debug Log</span>
            <span className="text-xs text-zinc-500 mr-2">{entries.length} entries</span>

            {/* Filter buttons */}
            <div className="flex gap-1 mr-2">
              {(["all", "info", "warn", "error"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFilter(lvl)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    filter === lvl
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Copy all logs"
            >
              {copied ? <span className="text-xs text-green-400">✓</span> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={clearLogs}
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Clear logs"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Log list */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overscroll-contain font-mono text-xs"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {visible.length === 0 ? (
              <p className="text-center text-zinc-600 py-12">No logs yet</p>
            ) : (
              visible.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex gap-2 px-4 py-1.5 border-b border-white/[0.04] ${levelBg[entry.level]}`}
                >
                  <span className="text-zinc-600 shrink-0">{formatTime(entry.ts)}</span>
                  <span className={`shrink-0 font-bold w-10 ${levelColor[entry.level]}`}>
                    {entry.level.toUpperCase()}
                  </span>
                  <span className="text-zinc-300 break-all leading-relaxed">{entry.message}</span>
                </div>
              ))
            )}
          </div>

          {/* Auto-scroll indicator */}
          {!autoScroll && (
            <button
              type="button"
              onClick={() => {
                setAutoScroll(true);
                if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
              }}
              className="absolute bottom-4 right-4 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-white shadow-lg"
              style={{ background: "rgba(40,40,40,0.95)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <ChevronDown size={12} />
              Jump to bottom
            </button>
          )}
        </div>
      )}
    </>
  );
}
