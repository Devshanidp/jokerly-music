"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Copy, X } from "lucide-react";
import { useBackHandler } from "@/hooks/useBackHandler";

export type TransferResult =
  | { type: "success"; title: string; message: string; url?: string | null }
  | { type: "error"; title: string; message: string; details?: string; needsReauth?: boolean };

interface Props {
  result: TransferResult;
  onClose: () => void;
  onReauthorize?: () => void;
}

export default function TransferResultDialog({ result, onClose, onReauthorize }: Props) {
  useBackHandler(true, onClose);
  const [copied, setCopied] = useState(false);
  const isSuccess = result.type === "success";
  const details = result.type === "error" ? result.details || result.message : "";
  const errorText = result.type === "error" ? `${result.title} ${result.message} ${details}`.toLowerCase() : "";
  const looksLikePermissionError =
    errorText.includes("permission") ||
    errorText.includes("token") ||
    errorText.includes("401") ||
    errorText.includes("unauthorized") ||
    errorText.includes("continue with your account");
  const canReauthorize = result.type === "error" && onReauthorize && (result.needsReauth || looksLikePermissionError);

  const copyDetails = async () => {
    await navigator.clipboard.writeText(details);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sheet-light w-full max-w-sm rounded-3xl border p-5 shadow-2xl shadow-black/30"
        style={{
          background: "var(--surface)",
          borderColor: isSuccess ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.35)",
        }}
      >
        {isSuccess ? (
          <div className="text-center space-y-4">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "rgba(34,197,94,0.18)" }}
            >
              <CheckCircle2 size={30} className="text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{result.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{result.message}</p>
            </div>
            <div
              className="rounded-2xl border px-4 py-3 text-left"
              style={{
                background: "rgba(34,197,94,0.10)",
                borderColor: "rgba(34,197,94,0.28)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-green-400/90">Success</p>
              <p className="mt-1 text-sm text-white/80">
                Your playlist is now in your connected Spotify library.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              {result.url ? (
                <button
                  onClick={() => window.open(result.url || "", "_blank", "noopener,noreferrer")}
                  className="flex-1 rounded-2xl btn-accent px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  Open in Spotify
                </button>
              ) : null}
              <button
                onClick={onClose}
                className={`${result.url ? "flex-1" : "w-full"} rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.1]`}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: "rgba(239,68,68,0.14)" }}
              >
                <AlertCircle size={22} className="text-[var(--accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-white">{result.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/55">{result.message}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-white/30 transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="max-h-32 overflow-auto rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-white/45">{details}</p>
              </div>
              <button
                onClick={copyDetails}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.06]"
              >
                <Copy size={14} />
                {copied ? "Copied" : "Copy error"}
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              {canReauthorize && (
                <button
                  onClick={onReauthorize}
                  className="flex-1 rounded-2xl btn-accent px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  Approve Spotify access
                </button>
              )}
              <button
                onClick={onClose}
                className={`${canReauthorize ? "flex-1" : "w-full"} rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/[0.1]`}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
