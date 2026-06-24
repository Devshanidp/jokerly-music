import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginClient from "./LoginClient";
import { AUTH_CSRF_COOKIE, AUTH_SITE_URL, readCsrfTokenFromCookie } from "@/lib/auth-url";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const csrfToken = readCsrfTokenFromCookie(cookieStore.get(AUTH_CSRF_COOKIE)?.value);

  // Visiting /api/auth/signin sets the CSRF cookie, then redirects back here.
  if (!csrfToken) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`${AUTH_SITE_URL}/login`)}`);
  }

  return (
    <Suspense fallback={null}>
      <LoginClient csrfToken={csrfToken} />
    </Suspense>
  );
}
