import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { NextAuthConfig } from "next-auth";
import { authConfig } from "./auth.config";
import { getMissingAuthEnv } from "./auth-env";
import { MUSIC_AUTH_SCOPES } from "./music-scopes";
import {
  CATALOG_ACCOUNTS_AUTHORIZE,
  CATALOG_ACCOUNTS_TOKEN,
  CATALOG_API_V1,
} from "./catalog-endpoints";
import { musicClientId, musicClientSecret } from "./music-auth-env";
import { AUTH_PROVIDER_ID } from "./catalog-endpoints";

const missingAuthEnv = getMissingAuthEnv();
if (missingAuthEnv.length > 0) {
  console.error(
    `[auth] Missing environment variables: ${missingAuthEnv.join(", ")}. Login will fail with Configuration error.`
  );
}

type MusicToken = JWT & {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  userId?: string;
  /** @deprecated Legacy JWT field from before userId rename */
  spotifyId?: string;
  authScope?: string;
  error?: string;
};

function resolveUserId(token: MusicToken): string | undefined {
  return token.userId ?? token.spotifyId ?? (typeof token.sub === "string" ? token.sub : undefined);
}

export async function refreshAccessToken(token: MusicToken): Promise<MusicToken> {
  if (!token.refreshToken) return { ...token, error: "RefreshAccessTokenError" };

  try {
    const res = await fetch(CATALOG_ACCOUNTS_TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${musicClientId()}:${musicClientSecret()}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: token.refreshToken }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
      userId: resolveUserId(token),
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

const musicProvider: NextAuthConfig["providers"][number] = {
  id: AUTH_PROVIDER_ID,
  name: "Music",
  type: "oauth",
  clientId: musicClientId(),
  clientSecret: musicClientSecret(),
  // State only — PKCE verifier cookies are often lost on mobile TWA round-trips.
  checks: ["state"],
  authorization: {
    url: CATALOG_ACCOUNTS_AUTHORIZE,
    params: { scope: MUSIC_AUTH_SCOPES, show_dialog: "true" },
  },
  token: CATALOG_ACCOUNTS_TOKEN,
  userinfo: {
    url: `${CATALOG_API_V1}/me`,
    async request({ tokens }: { tokens: { access_token?: string } }) {
      const res = await fetch(`${CATALOG_API_V1}/me`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!res.ok) {
        throw new Error(`Catalog profile request failed (${res.status})`);
      }
      return res.json();
    },
  },
  profile(profile) {
    const p = profile as {
      id: string;
      display_name?: string;
      email?: string;
      images?: { url: string }[];
    };
    return {
      id: p.id,
      name: p.display_name ?? "Listener",
      email: p.email,
      image: p.images?.[0]?.url,
    };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [musicProvider],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        const userId =
          account.providerAccountId ??
          (user && "id" in user ? String(user.id) : undefined) ??
          (typeof token.sub === "string" ? token.sub : undefined);
        return {
          ...token,
          sub: userId ?? token.sub,
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? (token as MusicToken).refreshToken,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          userId,
          authScope: account.scope,
          error: undefined,
        };
      }
      const musicToken = token as MusicToken;
      const userId = resolveUserId(musicToken);
      const withUserId = userId && !musicToken.userId ? { ...musicToken, userId } : musicToken;
      const expiresAt = withUserId.accessTokenExpires ?? 0;
      if (Date.now() < expiresAt - 60_000) return withUserId;
      if (!withUserId.refreshToken) return withUserId;
      return refreshAccessToken(withUserId);
    },
    async session({ session, token }) {
      const musicToken = token as MusicToken;
      const userId = resolveUserId(musicToken);
      session.accessToken = token.accessToken as string;
      session.userId = userId ?? "";
      session.authScope = token.authScope as string | undefined;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});
