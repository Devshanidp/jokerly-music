const GOOGLE_TRANSLATE = "https://translate.googleapis.com/translate_a/single";
const MYMEMORY = "https://api.mymemory.translated.net/get";
const CHUNK_SIZE = 450;

export const LYRIC_TARGET_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ml", label: "Malayalam" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "bn", label: "Bengali" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
] as const;

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let current = "";

  for (const line of text.split("\n")) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > CHUNK_SIZE && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

async function translateChunkGoogle(text: string, targetLang: string): Promise<string> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "auto",
    tl: targetLang,
    dt: "t",
    q: text,
  });

  const res = await fetch(`${GOOGLE_TRANSLATE}?${params}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Google translate ${res.status}`);

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error("Invalid translate response");

  const parts = (data[0] as unknown[])
    .map((row) => (Array.isArray(row) ? String(row[0] ?? "") : ""))
    .join("");

  const out = parts.trim();
  if (!out || out === text) throw new Error("Untranslated chunk");
  return out;
}

async function translateChunkMyMemory(text: string, targetLang: string): Promise<string> {
  const params = new URLSearchParams({
    q: text,
    langpair: `auto|${targetLang}`,
  });

  const res = await fetch(`${MYMEMORY}?${params}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`MyMemory ${res.status}`);

  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };

  if (data.responseStatus && data.responseStatus !== 200) {
    throw new Error("MyMemory unavailable");
  }

  const out = data.responseData?.translatedText?.trim() ?? "";
  if (!out || out.toUpperCase() === text.toUpperCase()) {
    throw new Error("MyMemory unchanged");
  }
  return out;
}

async function translateChunk(text: string, targetLang: string): Promise<string> {
  try {
    return await translateChunkGoogle(text, targetLang);
  } catch {
    return translateChunkMyMemory(text, targetLang);
  }
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || !targetLang) return trimmed;

  const chunks = chunkText(trimmed);
  const translated: string[] = [];

  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk, targetLang));
  }

  return translated.join("\n");
}

export async function translateLines(lines: string[], targetLang: string): Promise<string[]> {
  const normalized = lines.map((line) => line.trim());
  const unique = [...new Set(normalized.filter(Boolean))];
  if (unique.length === 0) return lines;

  const lookup = new Map<string, string>();
  const batchSize = 6;

  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const joined = batch.join("\x1e");

    try {
      const translated = await translateText(joined, targetLang);
      let parts = translated.split("\x1e").map((part) => part.trim());

      if (parts.length !== batch.length) {
        parts = await Promise.all(
          batch.map(async (line) => {
            try {
              return await translateText(line, targetLang);
            } catch {
              return line;
            }
          })
        );
      }

      batch.forEach((line, index) => lookup.set(line, parts[index] || line));
    } catch {
      batch.forEach((line) => lookup.set(line, line));
    }
  }

  return normalized.map((line) => (line ? lookup.get(line) ?? line : line));
}
