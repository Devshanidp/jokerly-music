import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

type LrcLine = { timeMs: number; text: string };

type LrclibPayload = {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  instrumental?: boolean;
};

type LyricsResult =
  | { kind: "synced"; syncedLines: LrcLine[] }
  | { kind: "plain"; plainText: string }
  | { kind: "notFound" };

function parseLrc(lrc: string): LrcLine[] {
  return lrc.split("\n").flatMap((line) => {
    const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/);
    if (!match) return [];
    const ms =
      Number(match[1]) * 60_000 +
      Number(match[2]) * 1_000 +
      Number((match[3] ?? "0").padEnd(3, "0"));
    const text = match[4].trim();
    if (!text) return [];
    return [{ timeMs: ms, text }];
  });
}

/** Strip remasters / feats / extras that break lyric lookups. */
function cleanTrackName(track: string): string {
  return track
    .replace(/\s*[\(\[].*?(remaster|remix|live|edit|version|bonus|deluxe|feat\.?|ft\.?).*?[\)\]]/gi, "")
    .replace(/\s*-\s*(remaster(ed)?(\s*\d{2,4})?|radio edit|live|remix).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLrclibRecord(raw: unknown): LrclibPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const synced =
    (typeof row.syncedLyrics === "string" ? row.syncedLyrics : null) ??
    (typeof row.synced_lyrics === "string" ? row.synced_lyrics : null);
  const plain =
    (typeof row.plainLyrics === "string" ? row.plainLyrics : null) ??
    (typeof row.plain_lyrics === "string" ? row.plain_lyrics : null);
  if (!synced?.trim() && !plain?.trim()) return null;
  return {
    syncedLyrics: synced,
    plainLyrics: plain,
    instrumental: Boolean(row.instrumental),
  };
}

function payloadToResult(data: LrclibPayload): LyricsResult {
  if (data.instrumental) return { kind: "notFound" };

  if (data.syncedLyrics) {
    const syncedLines = parseLrc(data.syncedLyrics);
    if (syncedLines.length > 0) return { kind: "synced", syncedLines };
  }

  if (data.plainLyrics?.trim()) {
    return { kind: "plain", plainText: data.plainLyrics.trim() };
  }

  return { kind: "notFound" };
}

async function fetchJson(url: string, timeoutMs = 6_000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "application/json",
        "User-Agent": "ShaNsMusic/1.0 (https://music.devshanidp.xyz)",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchLrclibGet(
  artist: string,
  track: string,
  durationSec?: number
): Promise<LrclibPayload | null> {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: track,
  });
  if (durationSec && durationSec > 0) {
    params.set("duration", String(durationSec));
  }
  return normalizeLrclibRecord(
    await fetchJson(`https://lrclib.net/api/get?${params.toString()}`, 5_000)
  );
}

async function fetchLrclibSearch(artist: string, track: string): Promise<LrclibPayload | null> {
  const urls = [
    `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`,
    `https://lrclib.net/api/search?q=${encodeURIComponent(`${track} ${artist}`)}`,
  ];

  const results = await Promise.all(urls.map((url) => fetchJson(url, 5_000)));
  for (const rows of results) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    for (const row of rows) {
      const normalized = normalizeLrclibRecord(row);
      if (normalized && !normalized.instrumental) return normalized;
    }
  }
  return null;
}

/** Plain-lyrics fallback when lrclib is down / empty. */
async function fetchLyricsOvh(artist: string, track: string): Promise<LrclibPayload | null> {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`;
  const data = (await fetchJson(url, 6_000)) as { lyrics?: string; error?: string } | null;
  const lyrics = data?.lyrics?.trim();
  if (!lyrics) return null;
  const cleaned = lyrics
    .replace(/^Paroles de la chanson.*\n+/i, "")
    .replace(/^\n+/, "")
    .trim();
  if (!cleaned) return null;
  return { plainLyrics: cleaned, syncedLyrics: null, instrumental: false };
}

async function fetchLyrics(
  artist: string,
  track: string,
  durationSec?: number
): Promise<LrclibPayload | null> {
  const direct = await fetchLrclibGet(artist, track, durationSec);
  if (direct) return direct;

  // Without duration, try again without it if we already included it (already handled above)
  if (durationSec) {
    const withoutDuration = await fetchLrclibGet(artist, track);
    if (withoutDuration) return withoutDuration;
  }

  return fetchLrclibSearch(artist, track);
}

function artistCandidates(artist: string): string[] {
  const parts = artist
    .split(/[,&]| feat\.? | ft\.? | featuring /i)
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Set([artist.trim(), ...parts].filter(Boolean))].slice(0, 3);
}

function trackCandidates(track: string): string[] {
  const cleaned = cleanTrackName(track);
  return [...new Set([track.trim(), cleaned].filter(Boolean))].slice(0, 2);
}

const CACHE_HEADERS = { "Cache-Control": "private, max-age=86400" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get("artist")?.trim();
  const track = searchParams.get("track")?.trim();
  const durationRaw = searchParams.get("duration");
  const durationSec = durationRaw ? Number(durationRaw) : undefined;
  const duration =
    durationSec && Number.isFinite(durationSec) && durationSec > 0
      ? Math.round(durationSec)
      : undefined;

  if (!artist || !track) {
    return NextResponse.json({ error: "artist and track required" }, { status: 400 });
  }

  try {
    const tracks = trackCandidates(track);
    const artists = artistCandidates(artist);

    for (const trackName of tracks) {
      for (const candidate of artists) {
        const data = await fetchLyrics(candidate, trackName, duration);
        if (!data) continue;

        const result = payloadToResult(data);
        if (result.kind === "synced") {
          return NextResponse.json({ syncedLines: result.syncedLines }, { headers: CACHE_HEADERS });
        }
        if (result.kind === "plain") {
          return NextResponse.json({ plainText: result.plainText }, { headers: CACHE_HEADERS });
        }
      }
    }

    // One plain-lyrics fallback (avoid nesting ovh in every candidate loop)
    const ovh = await fetchLyricsOvh(artists[0] ?? artist, tracks[1] ?? tracks[0] ?? track);
    if (ovh) {
      const result = payloadToResult(ovh);
      if (result.kind === "plain") {
        return NextResponse.json({ plainText: result.plainText }, { headers: CACHE_HEADERS });
      }
    }

    return NextResponse.json({ notFound: true });
  } catch (e) {
    console.error("[lyrics GET]", e);
    return NextResponse.json({ error: "Could not load lyrics" }, { status: 500 });
  }
}
