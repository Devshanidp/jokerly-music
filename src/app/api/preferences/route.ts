import { getApiSession, unauthorized } from "@/lib/api-auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export interface FavoriteArtist {
  id: string;
  name: string;
  image?: string | null;
}

function parseHomeOrder(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const ids = raw.filter((id): id is string => typeof id === "string");
  return ids.length > 0 ? ids : null;
}

export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ languages: [], favoriteArtists: [], homeOrder: null });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_language_prefs")
      .select("languages, favorite_artists, home_order")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (error) {
      console.error("[preferences GET]", error.message);
      return NextResponse.json({
        languages: ["english"],
        favoriteArtists: [],
        homeOrder: null,
        degraded: true,
      });
    }

    const languages = data?.languages;
    let favoriteArtists: FavoriteArtist[] = [];
    if (typeof data?.favorite_artists === "string") {
      try {
        favoriteArtists = JSON.parse(data.favorite_artists);
      } catch {
        /* ignore */
      }
    } else if (Array.isArray(data?.favorite_artists)) {
      favoriteArtists = data.favorite_artists;
    }

    return NextResponse.json({
      languages: Array.isArray(languages) ? languages : [],
      favoriteArtists,
      homeOrder: parseHomeOrder(data?.home_order),
    });
  } catch (e) {
    console.error("[preferences GET]", e);
    return NextResponse.json({
      languages: ["english"],
      favoriteArtists: [],
      homeOrder: null,
      degraded: true,
    });
  }
}

export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const updateData: Record<string, unknown> = {
    user_id: session.userId,
    updated_at: new Date().toISOString(),
  };

  if (Array.isArray(body.languages)) updateData.languages = body.languages;
  if (Array.isArray(body.favoriteArtists)) {
    updateData.favorite_artists = JSON.stringify(body.favoriteArtists);
  }
  if (Array.isArray(body.homeOrder)) {
    updateData.home_order = body.homeOrder.filter((id: unknown) => typeof id === "string");
  }

  // Nothing to write
  if (
    updateData.languages === undefined &&
    updateData.favorite_artists === undefined &&
    updateData.home_order === undefined
  ) {
    return NextResponse.json({ ok: false, error: "No preference fields provided" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("user_language_prefs")
      .upsert(updateData, { onConflict: "user_id" });

    if (error) {
      console.error("[preferences POST]", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[preferences POST]", e);
    return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
  }
}
