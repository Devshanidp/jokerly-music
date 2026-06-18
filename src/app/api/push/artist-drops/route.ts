import { CATALOG_API_V1 } from "@/lib/catalog-endpoints";
import { getApiSessionWithToken, unauthorized, tokenExpired } from "@/lib/api-auth";
import { getWebPush, toPushPayload } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isPushStorageUnavailable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.message?.toLowerCase().includes("push_subscriptions") || error.message?.toLowerCase().includes("artist_release_seen") || false;
}

async function catalogGet(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return res.json();
}

export async function POST() {
  const session = await getApiSessionWithToken();
  if (!session) return unauthorized();

  const supabase = await createClient();

  const [likedRes, subRes, seenRes] = await Promise.all([
    supabase.from("liked_artists").select("artist_id,artist_name").eq("user_id", session.userId).limit(20),
    supabase.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", session.userId),
    supabase.from("artist_release_seen").select("artist_id,last_release_id").eq("user_id", session.userId),
  ]);

  if (likedRes.error) return NextResponse.json({ error: likedRes.error.message }, { status: 500 });
  if (isPushStorageUnavailable(subRes.error) || isPushStorageUnavailable(seenRes.error)) {
    return NextResponse.json({ ok: false, available: false, notified: 0 });
  }
  if (subRes.error) return NextResponse.json({ error: subRes.error.message }, { status: 500 });
  if (seenRes.error) return NextResponse.json({ error: seenRes.error.message }, { status: 500 });

  const liked = likedRes.data ?? [];
  const subscriptions = subRes.data ?? [];
  const seenMap = new Map((seenRes.data ?? []).map((r) => [r.artist_id, r.last_release_id]));

  if (!liked.length || !subscriptions.length) return NextResponse.json({ ok: true, notified: 0 });

  let webpush;
  try {
    webpush = getWebPush();
  } catch {
    return NextResponse.json({ ok: false, available: false, notified: 0 });
  }
  let notified = 0;

  for (const artist of liked) {
    const data = await catalogGet(
      `${CATALOG_API_V1}/artists/${encodeURIComponent(artist.artist_id)}/albums?include_groups=album,single&limit=1&market=from_token`,
      session.accessToken as string
    );

    const latest = data?.items?.[0];
    if (!latest?.id) continue;

    const previous = seenMap.get(artist.artist_id);
    await supabase.from("artist_release_seen").upsert(
      {
        user_id: session.userId,
        artist_id: artist.artist_id,
        artist_name: artist.artist_name,
        last_release_id: latest.id,
        last_release_name: latest.name ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,artist_id" }
    );

    if (!previous || previous === latest.id) continue;

    const payload = toPushPayload({
      title: `${artist.artist_name} dropped new music`,
      body: latest.name ?? "Tap to listen on Jokerly",
      url: `/search?q=${encodeURIComponent(artist.artist_name)}`,
      icon: latest.images?.[0]?.url ?? "/icon-192.png",
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        notified += 1;
      } catch (err: any) {
        const statusCode = err?.statusCode as number | undefined;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("user_id", session.userId).eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, notified });
}
