"use client";

import { useState } from "react";
import { AlertCircle, Copy } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/player";
import { isWindowsDesktopApp } from "@/lib/desktop-app";
import { isPlayerAuthError } from "@/lib/eme-support";
import { useBackHandler } from "@/hooks/useBackHandler";

export default function DesktopErrorBox() {
  const { data: session } = useSession();
  const sdkError = usePlayerStore((s) => s.sdkError);
  const initializePlayer = usePlayerStore((s) => s.initializePlayer);
  const [copied, setCopied] = useState(false);

  const visible = isWindowsDesktopApp() && Boolean(sdkError);
  const errorText = sdkError ?? "";
  const needsReauth = isPlayerAuthError(errorText);

  const clearError = () => {
    usePlayerStore.setState({ sdkError: null });
  };

  const dismiss = () => {
    clearError();
  };

  useBackHandler(visible, dismiss);

  if (!visible) return null;

  const copyDetails = async () => {
    await navigator.clipboard.writeText(errorText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const retry = () => {
    usePlayerStore.setState({
      player: null,
      deviceId: null,
      isPlayerReady: false,
      sdkError: null,
      isTransitioning: false,
      pendingIndex: null,
    });
    if (session?.accessToken) {
      initializePlayer(session.accessToken as string);
    }
  };

  const reLogin = () => {
    usePlayerStore.setState({
      sdkError: null,
      player: null,
      deviceId: null,
      isPlayerReady: false,
      isPlaying: false,
      isTransitioning: false,
      pendingIndex: null,
    });
    void signOut({ callbackUrl: "/login" });
  };

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        className="sheet-light w-full max-w-sm rounded-3xl border p-5 shadow-2xl shadow-black/30"
        style={{
          background: "var(--surface)",
          borderColor: "rgba(239,68,68,0.35)",
        }}
      >
        <div className="text-center space-y-4">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "rgba(239,68,68,0.18)" }}
          >
            <AlertCircle size={30} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Playback error</p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Something went wrong while playing music in the Windows app.
            </p>
          </div>
          <div
            className="rounded-2xl border px-4 py-3 text-left"
            style={{
              background: "rgba(239,68,68,0.12)",
              borderColor: "rgba(239,68,68,0.40)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Details</p>
            <p className="mt-1.5 max-h-36 overflow-auto whitespace-pre-wrap break-words text-sm text-white/80">
              {errorText}
            </p>
          </div>
          <button
            onClick={copyDetails}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.06]"
          >
            <Copy size={14} />
            {copied ? "Copied" : "Copy error"}
          </button>
          <div className="flex gap-2 pt-1">
            {needsReauth ? (
              <button
                onClick={reLogin}
                className="flex-1 rounded-2xl btn-accent px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Re-login
              </button>
            ) : session?.accessToken ? (
              <button
                onClick={retry}
                className="flex-1 rounded-2xl btn-accent px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Retry
              </button>
            ) : (
              <button
                onClick={reLogin}
                className="flex-1 rounded-2xl btn-accent px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Re-login
              </button>
            )}
            <button
              onClick={dismiss}
              className="flex-1 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.1]"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
