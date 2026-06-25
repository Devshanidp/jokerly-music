"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";
import { LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";

function loginErrorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "Configuration") {
    return "Login session expired or was blocked. Tap Continue again. If it keeps failing, open https://music.devshanidp.xyz/login/start in Chrome, sign in there, then reopen the app.";
  }
  if (code === "AccessDenied") {
    return "Access denied. Add your email in Spotify Developer Dashboard → User Management (Development mode), then try again.";
  }
  if (code === "OAuthCallback" || code === "Callback") {
    return "Spotify rejected the login. Confirm your Spotify account is active, then try again.";
  }
  return `Sign-in failed (${code}). Tap Continue to try again.`;
}

export default function LoginClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const authError = useMemo(
    () => loginErrorMessage(searchParams.get("error")),
    [searchParams]
  );

  useEffect(() => {
    if (status !== "authenticated") return;
    const userId = (session as { userId?: string } | null)?.userId?.trim();
    if (userId && session?.accessToken) router.replace("/");
  }, [status, session, router]);

  // Drop stale ?error= from the URL after showing it once.
  useEffect(() => {
    if (!searchParams.get("error")) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#080406" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl" style={{ background: "radial-gradient(ellipse, rgba(140, 80, 200,0.18) 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-3xl" style={{ background: "rgba(140, 80, 200,0.06)" }} />
      </div>

      <div className="relative w-full max-w-sm text-center space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <Image src="/logo.png" alt={APP_NAME} width={80} height={80} className="rounded-2xl" unoptimized />
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">{APP_NAME}</h1>
          <p className="text-base" style={{ color: "rgba(255,255,255,0.45)" }}>{APP_TAGLINE}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-left">
          {[
            { icon: "🔍", label: "Search tracks & artists" },
            { icon: "✨", label: "Personalised picks" },
            { icon: "🎵", label: "Create playlists" },
            { icon: "📌", label: "Pin your favourites" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl px-3 py-2.5 btn-accent" style={{ background: "#161014", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-base">{icon}</span>
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{label}</span>
            </div>
          ))}
        </div>

        {authError ? (
          <div
            className="rounded-xl px-4 py-3 text-left text-xs leading-relaxed border border-purple-500/30"
            style={{ background: "rgba(140, 80, 200,0.12)", color: "rgba(255,200,200,0.95)" }}
          >
            {authError}
          </div>
        ) : null}

        <Link
          href="/login/start"
          className="w-full flex items-center justify-center gap-3 text-white font-bold py-4 rounded-2xl transition-all duration-200 text-base active:scale-[0.98] btn-accent"
        >
          <LogIn size={14} />
          Continue with your account
        </Link>

        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
          Each person signs in with their own account. Playlists, likes, and pins are saved per account.
        </p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
          Powered by Last.fm
        </p>
      </div>
    </div>
  );
}
