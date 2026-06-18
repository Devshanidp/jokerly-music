import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

function isValidUserId(userId: string | undefined | null): boolean {
  return typeof userId === "string" && userId.trim().length > 0;
}

function hasValidAccessToken(session: Session): boolean {
  return Boolean(session.accessToken?.trim()) && session.error !== "RefreshAccessTokenError";
}

/** Session with a catalog user id (required for per-user DB rows). */
export async function getApiSession(): Promise<Session | null> {
  try {
    const session = await auth();
    if (!session || !isValidUserId(session.userId)) return null;
    return session;
  } catch {
    return null;
  }
}

/** Session with user id and a live catalog access token. */
export async function getApiSessionWithToken(): Promise<Session | null> {
  const session = await getApiSession();
  if (!session || !hasValidAccessToken(session)) return null;
  return session;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function tokenExpired() {
  return NextResponse.json({ error: "Token expired, please re-login" }, { status: 401 });
}
