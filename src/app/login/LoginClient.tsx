"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import Image from "next/image";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";
import { MUSIC_SIGN_IN_OPTIONS, AUTH_PROVIDER_ID } from "@/lib/music-auth-client";

function loginErrorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "Configuration") {
    return "Server auth is not configured. In Vercel, set AUTH_SECRET, MUSIC_CLIENT_ID, and MUSIC_CLIENT_SECRET, then redeploy.";
  }
  if (code === "AccessDenied") {
    return "Access denied. Add your email in your app developer console → User Management (Development mode), then try again.";
  }
  if (code === "OAuthCallback" || code === "Callback") {
    return "Provider rejected the login. In Vercel, set MUSIC_CLIENT_ID and MUSIC_CLIENT_SECRET from your new app credentials, set NEXTAUTH_URL to https://music.devshanidp.xyz, add that redirect URI in app dashboard, then redeploy.";
  }
  return `Sign-in failed (${code}). Open https://music.devshanidp.xyz/login (not www), then try again.`;
}

export default function LoginClient() {
  const searchParams = useSearchParams();
  const authError = useMemo(
    () => loginErrorMessage(searchParams.get("error")),
    [searchParams]
  );
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await signIn(AUTH_PROVIDER_ID, { callbackUrl: `${window.location.origin}/` }, MUSIC_SIGN_IN_OPTIONS);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#080406" }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl" style={{ background: "radial-gradient(ellipse, rgba(232,40,43,0.18) 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-3xl" style={{ background: "rgba(232,40,43,0.06)" }} />
      </div>

      <div className="relative w-full max-w-sm text-center space-y-8">
        {/* Logo */}
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <Image src="/logo.png" alt={APP_NAME} width={80} height={80} className="rounded-2xl" unoptimized />
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">{APP_NAME}</h1>
          <p className="text-base" style={{ color: "rgba(255,255,255,0.45)" }}>{APP_TAGLINE}</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 text-left">
          {[
            { icon: "🔍", label: "Search tracks & artists" },
            { icon: "✨", label: "Personalised picks" },
            { icon: "🎵", label: "Create playlists" },
            { icon: "📌", label: "Pin your favourites" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#161014", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-base">{icon}</span>
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{label}</span>
            </div>
          ))}
        </div>

        {authError ? (
          <div
            className="rounded-xl px-4 py-3 text-left text-xs leading-relaxed border border-red-500/30"
            style={{ background: "rgba(232,40,43,0.12)", color: "rgba(255,200,200,0.95)" }}
          >
            {authError}
          </div>
        ) : null}

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-all duration-200 text-base active:scale-[0.98]"
          style={{ background: "#E8282B", boxShadow: "0 8px 32px rgba(232,40,43,0.40)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#F03336")}
          onMouseLeave={e => (e.currentTarget.style.background = "#E8282B")}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LogIn size={14} />
          )}
          {loading ? "Connecting..." : "Continue with your account"}
        </button>

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
