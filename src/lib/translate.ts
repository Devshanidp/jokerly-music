const MYMEMORY = "https://api.mymemory.translated.net/get";
const GOOGLE_TRANSLATE = "https://translate.googleapis.com/translate_a/single";
const CHUNK_SIZE = 450;
const LINE_CONCURRENCY = 5;

export const LYRIC_TRANSLATE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ml", label: "Malayalam" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "bn", label: "Bengali" },
  { code: "pa", label: "Punjabi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "de", label: "German" },
] as const;

export type LyricTranslateLang = (typeof LYRIC_TRANSLATE_LANGUAGES)[number]["code"];

function normalizeLang(code: string): LyricTranslateLang | null {
  const hit = LYRIC_TRANSLATE_LANGUAGES.find((l) => l.code === code);
  return hit?.code ?? null;
}

function normalizeForCompare(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function translationActuallyChanged(original: string[], translated: string[]): boolean {
  const pairs = original
    .map((line, index) => ({
      original: normalizeForCompare(line),
      translated: normalizeForCompare(translated[index] ?? ""),
    }))
    .filter((pair) => pair.original.length > 0);

  if (pairs.length === 0) return false;

  const changedCount = pairs.filter(
    (pair) => pair.translated.length > 0 && pair.original !== pair.translated
  ).length;

  return changedCount >= Math.max(1, Math.ceil(pairs.length * 0.15));
}

async function translateWithGoogle(
  text: string,
  targetLang: LyricTranslateLang,
  sourceLang = "auto"
): Promise<string> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: sourceLang,
    tl: targetLang,
    dt: "t",
    q: text,
  });

  const res = await fetch(`${GOOGLE_TRANSLATE}?${params}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JkMusic/1.0)",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Google Translate failed (${res.status})`);

  const data = (await res.json()) as unknown;
  const segments = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];

  const translated = segments
    .map((segment) => (Array.isArray(segment) ? String(segment[0] ?? "") : ""))
    .join("")
    .trim();

  if (!translated) throw new Error("Empty translation result");
  return translated;
}

async function translateWithMyMemory(
  text: string,
  targetLang: LyricTranslateLang,
  sourceLang = "auto"
): Promise<string> {
  const params = new URLSearchParams({
    q: text,
    langpair: `${sourceLang}|${targetLang}`,
  });

  const res = await fetch(`${MYMEMORY}?${params}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`MyMemory failed (${res.status})`);

  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };

  if (data.responseStatus && data.responseStatus !== 200) {
    throw new Error("MyMemory unavailable");
  }

  const translated = data.responseData?.translatedText?.trim() ?? "";
  if (!translated) throw new Error("Empty MyMemory result");
  return translated;
}

async function translateLine(text: string, targetLang: LyricTranslateLang): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const sourceCandidates = ["auto", "pa", "hi", "en"] as const;

  for (const sourceLang of sourceCandidates) {
    try {
      const google = await translateWithGoogle(trimmed, targetLang, sourceLang);
      if (normalizeForCompare(google) !== normalizeForCompare(trimmed)) {
        return google;
      }
    } catch {
      // try next source / provider
    }
  }

  try {
    const memory = await translateWithMyMemory(trimmed, targetLang, "auto");
    if (normalizeForCompare(memory) !== normalizeForCompare(trimmed)) return memory;
  } catch {
    // fall through
  }

  throw new Error("Could not translate this line");
}

export async function translateToLanguage(text: string, targetLang: string): Promise<string> {
  const lang = normalizeLang(targetLang);
  if (!lang) throw new Error("Unsupported language");

  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  if (trimmed.length <= CHUNK_SIZE) {
    return translateLine(trimmed, lang);
  }

  const chunks = trimmed.split("\n");
  const translated: string[] = [];

  for (let i = 0; i < chunks.length; i += LINE_CONCURRENCY) {
    const batch = chunks.slice(i, i + LINE_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (chunk) => {
        try {
          return await translateLine(chunk, lang);
        } catch {
          return chunk;
        }
      })
    );
    translated.push(...batchResults);
  }

  return translated.join("\n");
}

export async function translateLinesToLanguage(
  lines: string[],
  targetLang: string
): Promise<string[]> {
  const lang = normalizeLang(targetLang);
  if (!lang) throw new Error("Unsupported language");

  const results = [...lines];

  for (let i = 0; i < lines.length; i += LINE_CONCURRENCY) {
    const slice = lines.slice(i, i + LINE_CONCURRENCY);
    const translated = await Promise.all(
      slice.map(async (line) => {
        if (!line.trim()) return line;
        try {
          return await translateLine(line, lang);
        } catch {
          return line;
        }
      })
    );
    translated.forEach((line, offset) => {
      results[i + offset] = line;
    });
  }

  return results;
}

/** @deprecated Use translateToLanguage */
export async function translateToEnglish(text: string) {
  return translateToLanguage(text, "en");
}

/** @deprecated Use translateLinesToLanguage */
export async function translateLinesToEnglish(lines: string[]) {
  return translateLinesToLanguage(lines, "en");
}

export function googleTranslateUrl(text: string, targetLang: string) {
  const lang = normalizeLang(targetLang) ?? "en";
  const params = new URLSearchParams({
    sl: "auto",
    tl: lang,
    text: text.slice(0, 2000),
  });
  return `https://translate.google.com/?${params}`;
}
