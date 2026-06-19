import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Delete Account — ${APP_NAME}`,
  description: `How to delete your ${APP_NAME} account and associated data.`,
};

const CONTACT_EMAIL = "shanid77shan@gmail.com";
const LAST_UPDATED = "June 19, 2026";

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 pb-24 text-[15px] leading-relaxed text-white/90">
      <p className="mb-2 text-sm text-white/50">
        <Link href="/login" className="hover:text-white/70">
          {APP_NAME}
        </Link>
      </p>
      <h1 className="mb-2 text-3xl font-semibold text-white">Delete your account</h1>
      <p className="mb-8 text-sm text-white/50">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-6">
        <section>
          <p>
            This page explains how to delete your <strong>{APP_NAME}</strong> account and the data
            associated with it. {APP_NAME} is operated by ShaN.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">How to request deletion</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} account deletion request`)}`} className="text-purple-300 underline">
                {CONTACT_EMAIL}
              </a>{" "}
              from the email address linked to your account (if applicable).
            </li>
            <li>
              Use the subject line: <strong>{APP_NAME} account deletion request</strong>.
            </li>
            <li>
              Include the display name or account identifier you use in {APP_NAME} so we can locate
              your data.
            </li>
            <li>
              We will confirm your request by email and delete your account within{" "}
              <strong>30 days</strong>.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">What gets deleted</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Your account profile and sign-in association</li>
            <li>Liked songs and artists</li>
            <li>Playlists and pinned items</li>
            <li>Playback history and app preferences</li>
            <li>Push notification subscriptions</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">What may be kept</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Minimal server logs or backups may be retained for up to <strong>90 days</strong> for
              security, fraud prevention, or legal compliance, then automatically removed.
            </li>
            <li>
              Music downloaded for offline listening on your device stays on your device until you
              remove the app or clear app data.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">Delete data without deleting your account</h2>
          <p>
            {APP_NAME} does not currently offer in-app deletion of individual data types without
            closing your account. To remove specific data, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-300 underline">
              {CONTACT_EMAIL}
            </a>{" "}
            and describe what you want removed.
          </p>
        </section>

        <section>
          <p className="text-sm text-white/50">
            See also our{" "}
            <Link href="/privacy" className="text-purple-300 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
