import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track");
  const artist = searchParams.get("artist");

  if (!track || !artist) return NextResponse.json({ previewUrl: null });

  // iTunes Search API — free, no auth, reliable 30s previews
  try {
    const term = encodeURIComponent(`${track} ${artist}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=10&country=us`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();

    for (const item of data.results ?? []) {
      if (item.previewUrl) {
        return NextResponse.json({
          previewUrl: item.previewUrl,
          imageUrl: item.artworkUrl100?.replace("100x100bb", "300x300bb") ?? null,
          itunesUrl: item.trackViewUrl ?? null,
        });
      }
    }
  } catch {
    // fall through to null
  }

  return NextResponse.json({ previewUrl: null, imageUrl: null });
}
