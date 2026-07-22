import type { PlayableTrack } from "@/store/player";

export type ListeningContext = {
  queue: PlayableTrack[];
  queueIndex: number;
  progressMs: number;
  durationMs: number;
  updatedAt: number;
  source?: string;
};

const KEY = "jokerly-jump-back-v1";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function saveListeningContext(
  ctx: Omit<ListeningContext, "updatedAt"> & { updatedAt?: number }
) {
  if (typeof window === "undefined") return;
  const queue = Array.isArray(ctx.queue) ? ctx.queue.filter((t) => t?.name) : [];
  if (!queue.length) return;
  const queueIndex = Math.max(0, Math.min(ctx.queueIndex, queue.length - 1));
  const track = queue[queueIndex];
  if (!track) return;

  const payload: ListeningContext = {
    queue: queue.slice(0, 200).map((t) => ({
      name: t.name,
      artist: t.artist ?? "",
      image: t.image,
      uri: t.uri ?? null,
      durationMs: t.durationMs,
    })),
    queueIndex,
    progressMs: Math.max(0, Math.floor(ctx.progressMs || 0)),
    durationMs: Math.max(0, Math.floor(ctx.durationMs || track.durationMs || 0)),
    updatedAt: ctx.updatedAt ?? Date.now(),
    source: ctx.source,
  };

  try {
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readListeningContext(): ListeningContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ListeningContext;
    if (!parsed?.queue?.length) return null;
    if (Date.now() - (parsed.updatedAt || 0) > MAX_AGE_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    const queueIndex = Math.max(0, Math.min(parsed.queueIndex ?? 0, parsed.queue.length - 1));
    return { ...parsed, queueIndex };
  } catch {
    return null;
  }
}

export function clearListeningContext() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
