import { getPushPublicKey } from "@/lib/push";
import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = getPushPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
