"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Shuffle, Pin, Download, ListMusic, Loader2 } from "lucide-react";

interface Props {
  isPinned: boolean;
  pinning?: boolean;
  trackCount: number;
  downloadingPlaylist?: boolean;
  onShufflePlay: () => void;
  onTogglePin: () => void;
  onDownloadOffline: () => void;
  onOpen?: () => void;
  className?: string;
}

export default function PlaylistActionsMenu({
  isPinned,
  pinning = false,
  trackCount,
  downloadingPlaylist = false,
  onShufflePlay,
  onTogglePin,
  onDownloadOffline,
  onOpen,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const item = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    disabled?: boolean
  ) => (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(false);
        onClick();
      }}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/85 hover:bg-white/[0.06] disabled:opacity-40 transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
        aria-label="Playlist options"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-xl border border-white/10 py-1 shadow-2xl overflow-hidden"
          style={{ background: "rgba(12,4,6,0.98)", backdropFilter: "blur(16px)" }}
        >
          {onOpen &&
            item(<ListMusic size={15} className="text-white/50" />, "Open playlist", onOpen)}
          {item(
            <Shuffle size={15} className="text-[#E8282B]" />,
            "Shuffle play",
            onShufflePlay,
            trackCount === 0
          )}
          {item(
            pinning ? (
              <Loader2 size={15} className="animate-spin text-[#E8282B]" />
            ) : (
              <Pin size={15} className={isPinned ? "text-[#E8282B]" : "text-white/50"} />
            ),
            isPinned ? "Remove from speed dial" : "Pin to speed dial",
            onTogglePin,
            pinning
          )}
          {item(
            downloadingPlaylist ? (
              <Loader2 size={15} className="animate-spin text-[#E8282B]" />
            ) : (
              <Download size={15} className="text-white/50" />
            ),
            "Download for offline",
            onDownloadOffline,
            trackCount === 0 || downloadingPlaylist
          )}
        </div>
      )}
    </div>
  );
}
