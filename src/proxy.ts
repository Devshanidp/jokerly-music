import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = "music.devshanidp.xyz";

// NextAuth v5 session cookie names (HTTP vs HTTPS)
const SESSION_COOKIE = "authjs.session-token";
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

const STATIC_FILE_EXT_RE = /\.(?:png|jpg|jpeg|svg|webp|ico|json|webmanifest|txt|xml|js|css|map)$/i;

export function proxy(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0];
  if (host && host !== CANONICAL_HOST && (host === "www.devshanidp.xyz" || host === "devshanidp.xyz")) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = req.nextUrl;

  // Let static assets, API routes, auth, and Digital Asset Links pass through
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/.well-known/") ||
    pathname === "/login/start" ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    STATIC_FILE_EXT_RE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.getAll().some((cookie) => {
    const name = cookie.name;
    return (
      name === SESSION_COOKIE ||
      name === SECURE_SESSION_COOKIE ||
      name.startsWith(`${SESSION_COOKIE}.`) ||
      name.startsWith(`${SECURE_SESSION_COOKIE}.`)
    );
  });

  const isLoginPage = pathname === "/login";
  const isPublicPage = pathname === "/privacy" || pathname === "/delete-account";

  if (!hasSession && !isLoginPage && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except for:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
