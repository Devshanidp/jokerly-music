"use client";

import Image from "next/image";
import { Loader2, Music, Upload, X } from "lucide-react";
import { MusicPlaylist } from "@/types";
import { useBackHandler } from "@/hooks/useBackHandler";

interface Props {
  open: boolean;
  playlists: MusicPlaylist[];
  exportingId: string | null;
  onClose: () => void;
  onPick: (playlist: MusicPlaylist) => void;
}

export default function ExportToSpotifyPickSheet({
  open,
  playlists,
  exportingId,
  onClose,
  onPick,
}: Props) {
  useBackHandler(open, onClose);
  if (!open) return null;

  const busy = Boolean(exportingId);

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="sheet-light w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl overflow-hidden"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 flex items-center justify-center">
            <Upload size={16} className="text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white">Export to Spotify</h3>
            <p className="text-xs text-white/40">Pick a playlist to send to your connected account</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/30 hover:bg-white/[0.07] hover:text-white transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {playlists.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <Music size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No playlists to export yet</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {playlists.map((pl) => {
                const isBusy = exportingId === pl.id;
                const cover = pl.images?.[0]?.url;
                return (
                  <li key={pl.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onPick(pl)}
                      className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/15 p-2.5 text-left hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/[0.06]">
                        {cover ? (
                          <Image src={cover} alt="" fill className="object-cover" sizes="48px" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music size={16} className="text-white/25" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{pl.name}</p>
                        <p className="text-[11px] text-white/40 truncate">
                          {pl.tracks?.total ?? 0} tracks
                        </p>
                      </div>
                      {isBusy ? (
                        <Loader2 size={16} className="animate-spin text-[var(--accent)] shrink-0" />
                      ) : (
                        <Upload size={14} className="text-white/30 shrink-0" />
                      )}
                    </button>
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
