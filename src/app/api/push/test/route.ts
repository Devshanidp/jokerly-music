import { getApiSession, unauthorized } from "@/lib/api-auth";
import { APP_NAME } from "@/lib/branding";
import { getWebPush, toPushPayload } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isPushStorageUnavailable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.message?.toLowerCase().includes("push_subscriptions") || false;
}

export async function POST() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", session.userId);

  if (isPushStorageUnavailable(error)) return NextResponse.json({ ok: false, available: false, sent: 0 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ ok: false, sent: 0 });

  let webpush;
  try {
    webpush = getWebPush();
  } catch {
    return NextResponse.json({ ok: false, available: false, sent: 0 });
  }
  const payload = toPushPayload({
    title: `${APP_NAME} notifications enabled`,
    body: "You will now get release alerts for liked artists.",
    url: "/liked",
  });

  let sent = 0;
  for (const row of data) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        payload
      );
      sent += 1;
    } catch (err: any) {
      const statusCode = err?.statusCode as number | undefined;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("user_id", session.userId).eq("endpoint", row.endpoint);
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
