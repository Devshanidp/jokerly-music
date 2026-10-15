/** Guest mode: browse-only access without signing in (used by Play review and first-time visitors). */
export const GUEST_COOKIE = "shans_guest";

const SESSION_COOKIE = "authjs.session-token";
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

export function hasAuthSessionCookie(names: string[]): boolean {
  return names.some(
    (name) =>
      name === SESSION_COOKIE ||
      name === SECURE_SESSION_COOKIE ||
      name.startsWith(`${SESSION_COOKIE}.`) ||
      name.startsWith(`${SECURE_SESSION_COOKIE}.`)
  );
}

/** A guest is someone holding the guest cookie but no auth session. A real session always wins. */
export function isGuestRequest(cookies: { name: string; value: string }[]): boolean {
  const flagged = cookies.some((c) => c.name === GUEST_COOKIE && c.value === "1");
  if (!flagged) return false;
  return !hasAuthSessionCookie(cookies.map((c) => c.name));
}
