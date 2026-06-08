import { NextResponse } from "next/server";
import { getMissingAuthEnv, isAuthConfigured } from "@/lib/auth-env";

/** Public check: which auth env vars are set (no secrets exposed). */
export function GET() {
  const missing = getMissingAuthEnv();
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? null;
  return NextResponse.json({
    ok: isAuthConfigured(),
    missing,
    authUrl,
    hint:
      missing.length > 0
        ? "Set missing vars in Vercel → Environment Variables, then redeploy."
        : "If login still fails, update SPOTIFY_CLIENT_ID/SECRET to your new Spotify app and match redirect URI.",
  });
}
