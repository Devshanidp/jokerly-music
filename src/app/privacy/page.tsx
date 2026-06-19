import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description: `Privacy policy for the ${APP_NAME} mobile app and website.`,
};

const CONTACT_EMAIL = "shanid77shan@gmail.com";
const SITE_URL = "https://music.devshanidp.xyz";
const LAST_UPDATED = "June 19, 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 pb-24 text-[15px] leading-relaxed text-white/90">
      <p className="mb-2 text-sm text-white/50">
        <Link href="/login" className="hover:text-white/70">
          {APP_NAME}
        </Link>
      </p>
      <h1 className="mb-2 text-3xl font-semibold text-white">Privacy Policy</h1>
      <p className="mb-8 text-sm text-white/50">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-6">
        <section>
          <h2 className="mb-2 text-lg font-medium text-white">About this policy</h2>
          <p>
            This Privacy Policy describes how <strong>{APP_NAME}</strong> (“the App”, “we”, “our”)
            collects, uses, and protects information when you use the {APP_NAME} Android app and
            website at{" "}
            <a href={SITE_URL} className="text-purple-300 underline">
              {SITE_URL}
            </a>
            . {APP_NAME} is operated by ShaN (contact:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-300 underline">
              {CONTACT_EMAIL}
            </a>
            ).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">Information we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Account information:</strong> If you sign in, we receive basic profile
              information from our music authentication provider (such as display name and account
              identifier) to personalize your experience.
            </li>
            <li>
              <strong>Usage and preferences:</strong> We store your liked songs, playlists, pinned
              items, playback history, and app settings so the service works across sessions.
            </li>
            <li>
              <strong>Device and technical data:</strong> We may collect standard technical
              information such as browser or app type, device type, and approximate usage events to
              keep the service reliable and secure.
            </li>
            <li>
              <strong>Push notifications:</strong> If you enable notifications, we store a push
              subscription token to send alerts you opt into (for example, new releases from artists
              you follow).
            </li>
            <li>
              <strong>Offline downloads:</strong> Music you download for offline listening is stored
              locally on your device.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">How we use information</h2>
          <p>We use collected information to:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Provide music streaming, playlists, recommendations, and related features</li>
            <li>Remember your preferences and keep you signed in</li>
            <li>Improve performance, fix bugs, and protect against abuse</li>
            <li>Send optional push notifications you request</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">Third-party services</h2>
          <p>
            {APP_NAME} relies on third-party services to deliver music and infrastructure (for
            example, music catalog APIs, hosting, and database providers). Those services process
            data only as needed to operate the App. We do not sell your personal information.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">Data retention and security</h2>
          <p>
            We retain account-related data while your account is active or as needed to provide the
            service. We use reasonable technical and organizational measures to protect your
            information. No method of transmission or storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">Your choices</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>You can sign out at any time to end an authenticated session.</li>
            <li>You can disable push notifications in your device settings.</li>
            <li>
              You may request access to or deletion of your account data by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-300 underline">
                {CONTACT_EMAIL}
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">Children</h2>
          <p>
            {APP_NAME} is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us data, contact
            us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The “Last updated” date at the top
            of this page will reflect the latest version. Continued use of {APP_NAME} after changes
            means you accept the updated policy.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-white">Contact</h2>
          <p>
            Questions about this Privacy Policy or the {APP_NAME} app? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-300 underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
