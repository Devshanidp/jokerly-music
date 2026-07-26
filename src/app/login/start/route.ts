import { NextRequest, NextResponse } from "next/server";
import { AUTH_PROVIDER_ID } from "@/lib/catalog-endpoints";
import { AUTH_SITE_URL } from "@/lib/auth-url";
import { MUSIC_AUTH_SCOPES } from "@/lib/music-scopes";

/** Full-page OAuth kickoff for mobile TWA (avoids client-side CSRF/cookie issues). */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const upgrade = request.nextUrl.searchParams.get("upgrade") === "1";
  const callbackParam = request.nextUrl.searchParams.get("callbackUrl");
  const callbackUrl =
    callbackParam && callbackParam.startsWith("/")
      ? `${AUTH_SITE_URL}${callbackParam}`
      : `${AUTH_SITE_URL}/`;

  const csrfRes = await fetch(`${origin}/api/auth/csrf`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  if (!csrfRes.ok) {
    return NextResponse.redirect(`${AUTH_SITE_URL}/login?error=Configuration`);
  }

  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  // upgrade=1 forces Spotify consent so playlist/library write scopes can be granted
  const showDialogField = upgrade
    ? `<input type="hidden" name="show_dialog" value="true" />`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Signing in…</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      background: #080406; color: rgba(255,255,255,0.7); font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <p>${upgrade ? "Updating Spotify permissions…" : "Connecting your account…"}</p>
  <form id="oauth" method="POST" action="/api/auth/signin/${AUTH_PROVIDER_ID}">
    <input type="hidden" name="csrfToken" value="${csrfToken}" />
    <input type="hidden" name="callbackUrl" value="${callbackUrl}" />
    <input type="hidden" name="scope" value="${MUSIC_AUTH_SCOPES}" />
    ${showDialogField}
  </form>
  <script>document.getElementById("oauth").submit();</script>
</body>
</html>`;

  const response = new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

  for (const cookie of csrfRes.headers.getSetCookie()) {
    response.headers.append("Set-Cookie", cookie);
  }

  return response;
}
