import { getApiSessionWithToken, unauthorized } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getApiSessionWithToken();
  if (!session) return unauthorized();

  return NextResponse.json(
    { accessToken: session.accessToken },
    { headers: { "Cache-Control": "no-store" } }
  );
}
