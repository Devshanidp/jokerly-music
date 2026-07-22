"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, QrCode, Share2, X } from "lucide-react";
import { AUTH_SITE_URL } from "@/lib/auth-url";
import { useBackHandler } from "@/hooks/useBackHandler";

interface Props {
  open: boolean;
  playlistId: string;
  playlistName: string;
  onClose: () => void;
}

export default function SharePlaylistModal({ open, playlistId, playlistName, onClose }: Props) {
  useBackHandler(open, onClose);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(true);

  const shareUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/share/p/${playlistId}`;
    }
    return `${AUTH_SITE_URL}/share/p/${playlistId}`;
  }, [playlistId]);

  const qrUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(shareUrl)}`,
    [shareUrl]
  );

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setShowQr(true);
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: playlistName,
        text: `Listen to “${playlistName}” on ShaN'sMusic`,
        url: shareUrl,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/[0.08] p-5 shadow-2xl shadow-black/70"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Share playlist</p>
            <h3 className="text-lg font-bold text-white mt-1 line-clamp-2">{playlistName}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/30 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {showQr && (
          <div className="flex flex-col items-center mb-5">
            <div className="rounded-2xl bg-white p-3 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR code to open playlist" width={220} height={220} className="rounded-lg" />
            </div>
            <p className="mt-3 text-xs text-white/40 text-center">Scan to open this mix in the app</p>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-2.5 mb-3">
          <p className="text-[11px] text-white/35 mb-1">Link</p>
          <p className="text-xs text-white/70 break-all leading-relaxed">{shareUrl}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] px-3 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.06] transition-colors"
          >
            {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={nativeShare}
            className="flex items-center justify-center gap-2 rounded-2xl btn-accent px-3 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98]"
          >
            <Share2 size={15} />
            Share
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors py-2"
        >
          <QrCode size={13} />
          {showQr ? "Hide QR" : "Show QR"}
        </button>
      </div>
    </div>
  );
}
