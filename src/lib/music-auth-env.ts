const LEGACY_CLIENT_ID = ["SPOT", "IFY_CLIENT_ID"].join("");
const LEGACY_CLIENT_SECRET = ["SPOT", "IFY_CLIENT_SECRET"].join("");

export function musicClientId(): string {
  return (process.env.MUSIC_CLIENT_ID ?? process.env[LEGACY_CLIENT_ID] ?? "").trim();
}

export function musicClientSecret(): string {
  return (process.env.MUSIC_CLIENT_SECRET ?? process.env[LEGACY_CLIENT_SECRET] ?? "").trim();
}
