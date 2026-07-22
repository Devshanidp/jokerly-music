"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Download, FolderInput, Loader2, Music, Pin, X } from "lucide-react";
import { MusicPlaylist } from "@/types";
import { useToastStore } from "@/store/toast";
import { useBackHandler } from "@/hooks/useBackHandler";

interface SpotifyPlaylistItem {
  id: string;
  name: string;
  description: string;
  image: string | null;
  trackCount: number;
  owner: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (playlist: MusicPlaylist, pinned: boolean) => void;
}

export default function ImportSpotifyPlaylistsSheet({ open, onClose, onImported }: Props) {
  useBackHandler(open, onClose);
  const { toast } = useToastStore();
  const [items, setItems] = useState<SpotifyPlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/music/spotify-playlists", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load Spotify playlists");
      setItems(data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    void load();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, load]);

  if (!open) return null;

  const importPlaylist = async (pl: SpotifyPlaylistItem, pin: boolean) => {
    setImportingId(pl.id);
    try {
      const res = await fetch("/api/music/spotify-playlists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyPlaylistId: pl.id,
          name: pl.name,
          image: pl.image,
          pin,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Import failed");
      toast(`Imported “${data.name}” · ${data.importedCount} tracks`);
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
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 flex items-center justify-center">
            <FolderInput size={16} className="text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white">Import from Spotify</h3>
            <p className="text-xs text-white/40">One-tap copy into your local playlists</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/30 hover:bg-white/[0.07] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/40">
              <Loader2 size={22} className="animate-spin text-[var(--accent)]" />
              <p className="text-sm">Loading your Spotify playlists…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4 space-y-3">
              <p className="text-sm text-white/55">{error}</p>
              <button
                onClick={() => void load()}
                className="px-4 py-2 rounded-xl btn-accent text-white text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <Music size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No Spotify playlists found</p>
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
                        {pl.trackCount} tracks · {pl.owner}
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
