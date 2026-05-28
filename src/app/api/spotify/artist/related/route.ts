import { auth } from "@/lib/auth";
import { getArtist, searchSpotify } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids") ?? searchParams.get("id") ?? "";
  const seedIds = idsParam.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 5);
  const excludeIds = new Set(
    (searchParams.get("exclude") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );

  if (seedIds.length === 0) {
    return NextResponse.json({ error: "Artist id required" }, { status: 400 });
  }

  const seen = new Set<string>([...seedIds, ...excludeIds]);
  const artists: { id: string; name: string; images?: { url: string }[] }[] = [];

  for (const artistId of seedIds) {
    try {
      const artist = (await getArtist(artistId, session.accessToken)) as {
        name?: string;
        genres?: string[];
      };
      const name = artist?.name;
      if (!name) continue;

      const genre = artist.genres?.[0];
      const query = genre ? `genre:${genre}` : name;
      const data = (await searchSpotify(query, "artist", session.accessToken, 12)) as {
        artists?: { items?: { id: string; name: string; images?: { url: string }[] }[] };
      };

      for (const item of data.artists?.items ?? []) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        artists.push(item);
      }
    } catch {
      // continue with other seed artists
    }
  }

  return NextResponse.json({ artists });
}
