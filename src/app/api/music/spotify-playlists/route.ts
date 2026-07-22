import { getApiSessionWithToken, unauthorized } from "@/lib/api-auth";
import { getUserPlaylists } from "@/lib/music-api";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getApiSessionWithToken();
  if (!session) return unauthorized();

  try {
    const data: any = await getUserPlaylists(session.accessToken);
    const items = (data?.items ?? [])
      .filter((pl: any) => pl?.id && pl?.name)
      .map((pl: any) => ({
        id: pl.id as string,
        name: pl.name as string,
        description: (pl.description as string) || "",
        image: pl.images?.[0]?.url ?? pl.images?.[1]?.url ?? null,
        trackCount: pl.tracks?.total ?? 0,
        owner: pl.owner?.display_name ?? "Spotify",
        collaborative: Boolean(pl.collaborative),
      }));

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } }
    );
  } catch (e: any) {
    console.error("[spotify-playlists GET]", e);
    const status = e?.status === 401 || e?.status === 403 ? 401 : 502;
    return NextResponse.json(
      { error: e?.message || "Could not load Spotify playlists" },
      { status }
    );
  }
}
