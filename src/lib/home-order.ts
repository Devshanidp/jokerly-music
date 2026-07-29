export const HOME_SECTION_IDS = [
  "jumpBack",
  "dailyMix",
  "pinned",
  "pinnedArtists",
  "pinnedAlbums",
  "forYou",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  jumpBack: "Jump back in",
  dailyMix: "Daily Mix",
  pinned: "Pinned",
  pinnedArtists: "Pinned Artists",
  pinnedAlbums: "Pinned Albums",
  forYou: "For You",
};

const ORDER_KEY = "jokerly-home-order-v1";

export function normalizeHomeSectionOrder(raw: unknown): HomeSectionId[] {
  if (!Array.isArray(raw)) return [...HOME_SECTION_IDS];
  const valid = raw.filter((id): id is HomeSectionId =>
    HOME_SECTION_IDS.includes(id as HomeSectionId)
  );
  const missing = HOME_SECTION_IDS.filter((id) => !valid.includes(id));
  return [...valid, ...missing];
}

export function readHomeSectionOrder(): HomeSectionId[] {
  if (typeof window === "undefined") return [...HOME_SECTION_IDS];
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    if (!raw) return [...HOME_SECTION_IDS];
    return normalizeHomeSectionOrder(JSON.parse(raw));
  } catch {
    return [...HOME_SECTION_IDS];
  }
}

export function saveHomeSectionOrder(order: HomeSectionId[]) {
  if (typeof window === "undefined") return;
  const next = normalizeHomeSectionOrder(order);
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Persist order to the account so it survives reloads / other devices. */
export async function persistHomeSectionOrder(order: HomeSectionId[]) {
  const next = normalizeHomeSectionOrder(order);
  saveHomeSectionOrder(next);
  try {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ homeOrder: next }),
    });
  } catch {
    /* local cache still saved */
  }
}

/** Load order: local cache first, then server (server wins when present). */
export async function loadHomeSectionOrder(): Promise<HomeSectionId[]> {
  const local = readHomeSectionOrder();
  try {
    const res = await fetch("/api/preferences", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return local;
    const data = (await res.json()) as { homeOrder?: unknown };
    if (!Array.isArray(data.homeOrder) || data.homeOrder.length === 0) return local;
    const server = normalizeHomeSectionOrder(data.homeOrder);
    saveHomeSectionOrder(server);
    return server;
  } catch {
    return local;
  }
}
