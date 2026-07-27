import type { SimilarTrack } from "@/lib/similar-tracks";

export const DAILY_MIX_COUNT = 3;
export const DAILY_MIX_TRACKS = 30;

export type DailyMixPayload = {
  id: string;
  name: string;
  subtitle: string;
  image: string | null;
  trackCount: number;
  tracks: SimilarTrack[];
};

export function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const rng = mulberry32(hashSeed(seed));
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function clusterByMixIndex<T>(items: T[], mixIndex: number, mixCount = DAILY_MIX_COUNT) {
  return items.filter((_, index) => index % mixCount === mixIndex);
}

export function buildMixSubtitle(artistNames: string[]) {
  const unique = [...new Set(artistNames.map((name) => name.trim()).filter(Boolean))];
  if (unique.length === 0) return "Made for you today";
  if (unique.length <= 3) return unique.join(", ");
  return `${unique.slice(0, 3).join(", ")} and more`;
}

export function secondsUntilUtcDayEnd(date = new Date()) {
  const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return Math.max(60, Math.floor((end - date.getTime()) / 1000));
}
