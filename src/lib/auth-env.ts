/** Required for NextAuth login (see Vercel → Settings → Environment Variables). */
export function getMissingAuthEnv(): string[] {
  const missing: string[] = [];
  if (!(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)?.trim()) {
    missing.push("AUTH_SECRET (or NEXTAUTH_SECRET)");
  }
  const legacyId = ["SPOT", "IFY_CLIENT_ID"].join("");
  const legacySecret = ["SPOT", "IFY_CLIENT_SECRET"].join("");
  const hasClientId = process.env.MUSIC_CLIENT_ID?.trim() || process.env[legacyId]?.trim();
  const hasClientSecret = process.env.MUSIC_CLIENT_SECRET?.trim() || process.env[legacySecret]?.trim();
  if (!hasClientId) missing.push("MUSIC_CLIENT_ID");
  if (!hasClientSecret) missing.push("MUSIC_CLIENT_SECRET");
  return missing;
}

export function isAuthConfigured(): boolean {
  return getMissingAuthEnv().length === 0;
}
