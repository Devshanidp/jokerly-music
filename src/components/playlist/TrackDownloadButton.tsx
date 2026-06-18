"use client";

import { useEffect } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { useOfflineStore, type DownloadableTrack } from "@/store/offline";
import { useToastStore } from "@/store/toast";

interface Props {
  track: DownloadableTrack;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

export default function TrackDownloadButton({ track, size = 13, className = "", showLabel = false }: Props) {
  const { toast } = useToastStore();
  const hydrate = useOfflineStore((s) => s.hydrate);
  const hydrated = useOfflineStore((s) => s.hydrated);
  const downloadTrack = useOfflineStore((s) => s.downloadTrack);
  const removeDownload = useOfflineStore((s) => s.removeDownload);
  const isDownloaded = useOfflineStore((s) =>
    s.isDownloaded(track.uri, track.name, track.artist)
  );
  const isDownloading = useOfflineStore((s) =>
    s.isDownloading(track.uri, track.name, track.artist)
  );

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;

    if (isDownloaded) {
      await removeDownload(track.uri, track.name, track.artist);
      toast("Removed from offline library", "success");
      return;
    }

    const ok = await downloadTrack(track);
    if (ok) {
      toast("Saved for offline (30s preview)", "success");
    } else {
      toast("No preview available to download", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDownloading}
      title={isDownloaded ? "Remove offline download" : "Download for offline"}
      className={`shrink-0 p-1.5 rounded-lg transition-all disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 ${
        isDownloaded
          ? "text-[var(--accent)] bg-[var(--accent)]/10"
          : "text-white/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10"
      } ${className}`}
    >
      {isDownloading ? (
        <Loader2 size={size} className="animate-spin" />
      ) : isDownloaded ? (
        <Check size={size} />
      ) : (
        <Download size={size} />
      )}
      {showLabel && (
        <span className="sr-only">{isDownloaded ? "Downloaded" : "Download"}</span>
      )}
    </button>
  );
}
