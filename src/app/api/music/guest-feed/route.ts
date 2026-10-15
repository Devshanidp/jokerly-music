import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppAccessToken } from "@/lib/app-token";
import { isGuestRequest } from "@/lib/guest";
import { getLanguage } from "@/lib/languages";
import { searchCatalog } from "@/lib/music-api";

export const maxDuration = 30;

const GUEST_LANGS = ["english", "hindi", "korean", "spanish"];
const CACHE_MS = 15 * 60 * 1000;

let cache: { at: number; sections: unknown[] } | null = null;

export async function GET() {
  const jar = await cookies();
  if (!isGuestRequest(jar.getAll())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ sections: cache.sections });
  }

  const token = await getAppAccessToken();
  if (!token) {
    return NextResponse.json({ sections: [], error: "Catalog unavailable" }, { status: 503 });
  }

  const results = await Promise.allSettled(
    GUEST_LANGS.map(async (langId) => {
      const lang = getLanguage(langId);
      if (!lang) return null;
      const [trackData, artistData] = await Promise.all([
        searchCatalog(lang.query, "track", token, 10),
        searchCatalog(lang.artistQuery, "artist", token, 6),
      ]);
      return {
        langId,
        label: lang.label,
        emoji: lang.emoji,
        tracks: trackData.tracks?.items ?? [],
        artists: artistData.artists?.items ?? [],
      };
    })
  );

  const sections = results.flatMap((r) =>
    r.status === "fulfilled" && r.value !== null ? [r.value] : []
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`guest-feed failed for ${GUEST_LANGS[i]}:`, r.reason?.message ?? r.reason);
    }
  });

  if (sections.length > 0) cache = { at: Date.now(), sections };

  if (sections.length === 0) {
    return NextResponse.json({ sections: [], error: "Catalog unavailable" }, { status: 502 });
  }
  return NextResponse.json({ sections });
}
