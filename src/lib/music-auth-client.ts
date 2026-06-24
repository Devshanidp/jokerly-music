import { AUTH_PROVIDER_ID } from "@/lib/catalog-endpoints";
import { MUSIC_AUTH_SCOPES } from "@/lib/music-scopes";

/** Forces account picker on sign-in. */
export const MUSIC_SIGN_IN_OPTIONS = {
  scope: MUSIC_AUTH_SCOPES,
  show_dialog: "true",
} as const;

export { AUTH_PROVIDER_ID };

/** POST form sign-in — reliable on mobile TWA and Next.js 16 (client signIn() can hit Configuration errors). */
export async function submitMusicSignIn(callbackUrl: string): Promise<void> {
  const res = await fetch("/api/auth/csrf");
  if (!res.ok) throw new Error("Failed to start sign-in");
  const { csrfToken } = (await res.json()) as { csrfToken: string };

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/api/auth/signin/${AUTH_PROVIDER_ID}`;

  const add = (name: string, value: string) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };

  add("csrfToken", csrfToken);
  add("callbackUrl", callbackUrl);
  for (const [key, value] of Object.entries(MUSIC_SIGN_IN_OPTIONS)) {
    add(key, String(value));
  }

  document.body.appendChild(form);
  form.submit();
}
