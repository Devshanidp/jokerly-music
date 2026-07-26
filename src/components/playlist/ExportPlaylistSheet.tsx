"use client";

import { Upload, FileDown, Music2, X, Loader2 } from "lucide-react";
import { useBackHandler } from "@/hooks/useBackHandler";

interface Props {
  open: boolean;
  playlistName: string;
  trackCount: number;
  transferringSpotify?: boolean;
  onClose: () => void;
  onExportSpotify: () => void;
  onExportYouTube: () => void;
  onDownloadM3U: () => void;
}

export default function ExportPlaylistSheet({
  open,
  playlistName,
  trackCount,
  transferringSpotify = false,
  onClose,
  onExportSpotify,
  onExportYouTube,
  onDownloadM3U,
}: Props) {
  useBackHandler(open, onClose);
  if (!open) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !transferringSpotify) onClose();
      }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="sheet-light w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-black/10"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="min-w-0 pr-3">
            <h2 className="text-lg font-semibold text-white truncate">Export playlist</h2>
            <p className="text-xs text-white/40 truncate mt-0.5">
              {playlistName} · {trackCount} tracks
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={transferringSpotify}
            className="p-1 rounded-lg hover:bg-white/[0.08] transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <button
            type="button"
            disabled={transferringSpotify}
            onClick={onExportSpotify}
            className="w-full flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--accent)]/35 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/15 transition-colors text-left disabled:opacity-50"
          >
            <div className="mt-0.5 p-2 rounded-xl bg-[var(--accent)]/20 text-[var(--accent)]">
              {transferringSpotify ? <Loader2 size={16} className="animate-spin" /> : <Music2 size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {transferringSpotify ? "Adding to Spotify…" : "Add to Spotify"}
              </p>
              <p className="text-xs text-white/45 mt-0.5 leading-relaxed">
                Export this playlist to your connected Spotify account
              </p>
            </div>
            <Upload size={14} className="text-white/30 mt-1 shrink-0" />
          </button>

          <button
            type="button"
            disabled={transferringSpotify}
            onClick={onExportYouTube}
            className="w-full flex items-start gap-3 p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left disabled:opacity-50"
          >
            <div className="mt-0.5 p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <Music2 size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">YouTube Music</p>
              <p className="text-xs text-white/45 mt-0.5 leading-relaxed">
                Create a matching playlist on your YouTube Music account
              </p>
            </div>
            <Upload size={14} className="text-white/30 mt-1 shrink-0" />
          </button>

          <button
            type="button"
            disabled={transferringSpotify}
            onClick={onDownloadM3U}
            className="w-full flex items-start gap-3 p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left disabled:opacity-50"
          >
            <div className="mt-0.5 p-2 rounded-xl bg-white/[0.06] text-white/70">
              <FileDown size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">M3U file</p>
              <p className="text-xs text-white/45 mt-0.5 leading-relaxed">
                Download for Spotify, Apple Music, Amazon Music via TuneMyMusic or similar tools
              </p>
            </div>
            <Upload size={14} className="text-white/30 mt-1 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
