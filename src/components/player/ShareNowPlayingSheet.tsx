"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Copy, Download, Loader2, Music, Share2, X } from "lucide-react";
import { PlayableTrack } from "@/store/player";
import { APP_NAME } from "@/lib/branding";
import {
  buildNowPlayingShareText,
  createNowPlayingCardBlob,
} from "@/lib/share-now-playing-card";
import { useBackHandler } from "@/hooks/useBackHandler";
import { useToastStore } from "@/store/toast";

interface Props {
  open: boolean;
  track: PlayableTrack;
  onClose: () => void;
}

export default function ShareNowPlayingSheet({ open, track, onClose }: Props) {
  useBackHandler(open, onClose);
  const { toast } = useToastStore();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setBusy(false);
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const shareText = buildNowPlayingShareText(track);

  const createCardFile = async () => {
    const blob = await createNowPlayingCardBlob({
      name: track.name,
      artist: track.artist,
      imageUrl: track.image,
    });
    return new File([blob], "now-playing.png", { type: "image/png" });
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast("Copied share text", "success");
    } catch {
      toast("Could not copy text", "error");
    }
  };

  const saveImage = async () => {
    setBusy(true);
    try {
      const blob = await createNowPlayingCardBlob({
        name: track.name,
        artist: track.artist,
        imageUrl: track.image,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${track.name.replace(/[^\w\s-]/g, "").trim() || "now-playing"}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast("Image saved", "success");
    } catch (e) {
      toast((e as Error).message || "Could not save image", "error");
    } finally {
      setBusy(false);
    }
  };

  const nativeShare = async () => {
    setBusy(true);
    try {
      const file = await createCardFile();
      if (navigator.share) {
        const payload: ShareData = {
          title: `${track.name} — ${track.artist}`,
          text: shareText,
        };
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ ...payload, files: [file] });
        } else {
          await navigator.share(payload);
        }
        return;
      }
      await saveImage();
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast((e as Error).message || "Share failed", "error");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="sheet-light w-full max-w-sm max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-black/10 shadow-2xl overflow-hidden"
        style={{ background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-white/[0.06] shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 flex items-center justify-center">
            <Share2 size={16} className="text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white">Share now playing</h3>
            <p className="text-xs text-white/40">Send a card with this track</p>
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

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div
            className="relative isolate mx-auto w-full max-w-[280px] overflow-hidden rounded-3xl border border-white/20 shadow-2xl shadow-black/40"
            style={{
              aspectRatio: "4 / 5",
              background: "linear-gradient(160deg, #131316 0%, #09090b 50%, #18090b 100%)",
            }}
          >
            {track.image && (
              <Image
                src={track.image}
                alt=""
                fill
                unoptimized
                aria-hidden
                sizes="280px"
                className="-z-20 scale-125 object-cover opacity-55 blur-2xl saturate-150"
              />
            )}
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/25 via-black/50 to-black/80" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -right-8 top-8 h-28 w-28 rounded-full bg-[#EF4444]/20 blur-2xl" />
              <div className="absolute -left-6 bottom-16 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute inset-3 rounded-[1.35rem] border border-white/20 bg-black/30 shadow-inner backdrop-blur-md" />
            </div>

            <div className="relative flex h-full flex-col px-7 pb-6 pt-6">
              <p className="mx-auto rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.24em] text-white/90 backdrop-blur-xl">
                Now playing
              </p>

              <div className="relative mx-auto mt-4 aspect-square w-[72%] overflow-hidden rounded-3xl border border-white/25 bg-white/10 shadow-2xl shadow-black/40">
                {track.image ? (
                  <Image src={track.image} alt="" fill unoptimized className="object-cover" sizes="220px" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Music size={40} className="text-[#EF4444]/30" />
                  </div>
                )}
              </div>

              <div className="mt-4 min-h-0 flex-1 text-center">
                <p className="line-clamp-2 text-lg font-bold leading-tight text-white">{track.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-white/55">{track.artist}</p>
              </div>

              <div className="mt-auto border-t border-white/15 pt-3 text-center">
                <p className="text-sm font-bold text-[#EF4444]">{APP_NAME}</p>
                <p className="text-[11px] text-white/50">Listening you</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-2.5">
            <p className="text-[11px] text-white/35 mb-1">Share text</p>
            <p className="text-xs text-white/70 leading-relaxed">{shareText}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void copyText()}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] px-3 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
            >
              {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy text"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveImage()}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] px-3 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Save image
            </button>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void nativeShare()}
            className="w-full flex items-center justify-center gap-2 rounded-2xl btn-accent px-4 py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
            {busy ? "Preparing…" : "Share card"}
          </button>
        </div>
      </div>
    </div>
  );
}
