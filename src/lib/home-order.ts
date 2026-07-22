export const HOME_SECTION_IDS = [
  "jumpBack",
  "recent",
  "pinned",
  "pinnedArtists",
  "pinnedAlbums",
  "forYou",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  jumpBack: "Jump back in",
  recent: "Recently Played",
  pinned: "Pinned",
  pinnedArtists: "Pinned Artists",
  pinnedAlbums: "Pinned Albums",
  forYou: "For You",
};

const ORDER_KEY = "jokerly-home-order-v1";

export function readHomeSectionOrder(): HomeSectionId[] {
  if (typeof window === "undefined") return [...HOME_SECTION_IDS];
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    if (!raw) return [...HOME_SECTION_IDS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...HOME_SECTION_IDS];
    const valid = parsed.filter((id): id is HomeSectionId =>
      HOME_SECTION_IDS.includes(id as HomeSectionId)
    );
    const missing = HOME_SECTION_IDS.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  } catch {
    return [...HOME_SECTION_IDS];
  }
}

export function saveHomeSectionOrder(order: HomeSectionId[]) {
  if (typeof window === "undefined") return;
  const valid = order.filter((id): id is HomeSectionId =>
    HOME_SECTION_IDS.includes(id)
  );
  const missing = HOME_SECTION_IDS.filter((id) => !valid.includes(id));
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify([...valid, ...missing]));
  } catch {
    /* ignore */
  }
}
