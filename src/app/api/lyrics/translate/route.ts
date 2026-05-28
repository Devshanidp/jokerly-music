import { translateLines, translateText } from "@/lib/translate";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      target?: string;
      lines?: string[];
      plainText?: string;
    };

    const target = body.target?.trim();
    if (!target) {
      return NextResponse.json({ error: "target language required" }, { status: 400 });
    }

    if (Array.isArray(body.lines) && body.lines.length > 0) {
      const lines = await translateLines(body.lines, target);
      return NextResponse.json({ lines });
    }

    if (typeof body.plainText === "string" && body.plainText.trim()) {
      const plainText = await translateText(body.plainText, target);
      return NextResponse.json({ plainText });
    }

    return NextResponse.json({ error: "lines or plainText required" }, { status: 400 });
  } catch (e) {
    console.error("[lyrics/translate]", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 502 });
  }
}
