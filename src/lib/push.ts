import webpush from "web-push";

let configured = false;

export function getPushPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

export function getWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@jokerly.app";

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID keys");
  }

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }

  return webpush;
}

export function toPushPayload(data: {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}) {
  return JSON.stringify({
    title: data.title,
    body: data.body,
    url: data.url ?? "/",
    icon: data.icon ?? "/icon-192.png",
    badge: "/icon-96.png",
  });
}
