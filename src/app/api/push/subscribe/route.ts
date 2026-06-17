import { getApiSession, unauthorized } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function isPushStorageUnavailable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.message?.toLowerCase().includes("push_subscriptions") || false;
}

export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", session.userId)
    .limit(1);

  if (isPushStorageUnavailable(error)) {
    return NextResponse.json({ subscribed: false, available: false });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscribed: (data ?? []).length > 0 });
}

export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => null)) as PushSubscriptionPayload | null;
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: session.userId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        subscription: body,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" }
    );

  if (isPushStorageUnavailable(error)) {
    return NextResponse.json({ ok: false, available: false, error: "Push subscriptions are unavailable." }, { status: 503 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", session.userId)
    .eq("endpoint", body.endpoint);

  if (isPushStorageUnavailable(error)) {
    return NextResponse.json({ ok: false, available: false, error: "Push subscriptions are unavailable." }, { status: 503 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
