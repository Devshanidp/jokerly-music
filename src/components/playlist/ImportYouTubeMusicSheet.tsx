"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Download, Loader2, Music, Pin, X } from "lucide-react";
import { MusicPlaylist } from "@/types";
import { useToastStore } from "@/store/toast";
import { useBackHandler } from "@/hooks/useBackHandler";

interface YTPlaylistItem {
  id: string;
  name: string;
  trackCount: number;
  image: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (playlist: MusicPlaylist, pinned: boolean) => void;
}

type Step = "cookies" | "list";

const COOKIE_GUIDE =
  "1. Go to https://music.youtube.com\n2. Open DevTools (F12)\n3. Network tab → click any request to music.youtube.com\n4. Copy the full Cookie request header\n5. Paste it below";

export default function ImportYouTubeMusicSheet({ open, onClose, onImported }: Props) {
  useBackHandler(open, onClose);
  const { toast } = useToastStore();
  const [step, setStep] = useState<Step>("cookies");
  const [cookieString, setCookieString] = useState("");
  const [items, setItems] = useState<YTPlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep("cookies");
      setCookieString("");
      setItems([]);
      setError(null);
      setImportingId(null);
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const loadPlaylists = async () => {
    if (!cookieString.trim()) {
      toast("Please paste your YouTube Music cookies", "error");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/youtube-music/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookieString }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load YouTube Music playlists");
      setItems(data.items ?? []);
      setStep("list");
    } catch (e) {
      setError((e as Error).message);
      toast((e as Error).message || "Failed to load playlists", "error");
    } finally {
      setLoading(false);
    }
  };

  const importPlaylist = async (pl: YTPlaylistItem, pin: boolean) => {
    setImportingId(pl.id);
    try {
      const res = await fetch("/api/youtube-music/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookieString,
          playlistId: pl.id,
          name: pl.name,
          image: pl.image,
          pin,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Import failed");
      const missed =
        typeof data.unresolvedCount === "number" && data.unresolvedCount > 0
          ? ` · ${data.unresolvedCount} unmatched`
          : "";
      toast(`Imported “${data.name}” · ${data.importedCount} tracks${missed}`, "success");
      onImported(data as MusicPlaylist, Boolean(data.pinned));
      onClose();
    } catch (e) {
      toast((e as Error).message || "Import failed", "error");
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sheet-light w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl overflow-hidden"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-white/[0.06]">
          {step === "list" ? (
            <button
              type="button"
              onClick={() => setStep("cookies")}
              className="rounded-xl p-1.5 text-white/40 hover:bg-white/[0.07] hover:text-white transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 flex items-center justify-center">
              <Download size={16} className="text-[var(--accent)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white">Import from YouTube Music</h3>
            <p className="text-xs text-white/40">
              {step === "cookies" ? "Paste cookies to load your library" : "Pick a playlist to copy in"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/30 hover:bg-white/[0.07] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {step === "cookies" ? (
            <div className="space-y-4">
              <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{COOKIE_GUIDE}</p>
              <textarea
                value={cookieString}
                onChange={(e) => setCookieString(e.target.value)}
                placeholder="Paste full Cookie header value here..."
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.08] focus:border-white/[0.15] text-white placeholder-white/25 resize-none focus:outline-none transition-colors"
                rows={4}
              />
              <p className="text-xs text-white/40">Your cookie is only used for this request and not stored.</p>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="button"
                disabled={loading || !cookieString.trim()}
                onClick={() => void loadPlaylists()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl btn-accent text-white text-sm font-bold disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Loading playlists…" : "Continue"}
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/40">
              <Loader2 size={22} className="animate-spin text-[var(--accent)]" />
              <p className="text-sm">Loading your YouTube Music playlists…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4 space-y-3">
              <p className="text-sm text-white/55">{error}</p>
              <button
                onClick={() => void loadPlaylists()}
                className="px-4 py-2 rounded-xl btn-accent text-white text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <Music size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No YouTube Music playlists found</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map((pl) => {
                const busy = importingId === pl.id;
                return (
                  <li
                    key={pl.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/15 p-2.5"
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/[0.06]">
                      {pl.image ? (
                        <Image src={pl.image} alt="" fill className="object-cover" sizes="48px" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music size={16} className="text-white/25" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{pl.name}</p>
                      <p className="text-[11px] text-white/40 truncate">
                        {pl.trackCount > 0 ? `${pl.trackCount} tracks` : "Playlist"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={!!importingId}
                        onClick={() => void importPlaylist(pl, true)}
                        title="Import and pin"
                        className="p-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-[var(--accent)] hover:bg-white/[0.05] disabled:opacity-40 transition-colors"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Pin size={14} />}
                      </button>
                      <button
                        type="button"
                        disabled={!!importingId}
                        onClick={() => void importPlaylist(pl, false)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl btn-accent text-white text-xs font-bold disabled:opacity-40 transition-all active:scale-95"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                        Import
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
