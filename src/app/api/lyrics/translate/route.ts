import {
  translationActuallyChanged,
  translateLinesToLanguage,
  translateToLanguage,
} from "@/lib/translate";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      targetLang?: string;
      lines?: string[];
      text?: string;
    };

    const targetLang = body.targetLang?.trim();
    if (!targetLang) {
      return NextResponse.json({ error: "targetLang required" }, { status: 400 });
    }

    if (Array.isArray(body.lines) && body.lines.length > 0) {
      const original = body.lines;
      const lines = await translateLinesToLanguage(original, targetLang);
      const changed = translationActuallyChanged(original, lines);
      if (!changed) {
        return NextResponse.json(
          {
            error:
              "Translation did not change the lyrics. Try another language or use Google Translate.",
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { lines, targetLang, changed: true },
        { headers: { "Cache-Control": "private, max-age=86400" } }
      );
    }

    if (typeof body.text === "string" && body.text.trim()) {
      const original = body.text.trim();
      const text = await translateToLanguage(original, targetLang);
      const changed = translationActuallyChanged([original], [text]);
      if (!changed) {
        return NextResponse.json(
          {
            error:
              "Translation did not change the lyrics. Try another language or use Google Translate.",
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { text, targetLang, changed: true },
        { headers: { "Cache-Control": "private, max-age=86400" } }
      );
    }

    return NextResponse.json({ error: "lines or text required" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
