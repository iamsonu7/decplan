import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy: Journey HQ" };

// Public page. Google requires a privacy policy link before the OAuth app can be set to "In production".
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 md:p-10">
      <div className="card p-8">
        <h1 className="text-4xl font-extrabold">Privacy policy</h1>
        <p className="mt-2 text-muted">Journey HQ is a private app used by one person, its owner.</p>

        <h2 className="mt-8 text-xl font-bold">Who can use it</h2>
        <p className="mt-2">Only the owner&apos;s Google account can sign in. Every other account is rejected and nothing about it is stored.</p>

        <h2 className="mt-6 text-xl font-bold">What Google data it uses</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Gmail: reads threads to detect replies, creates drafts, and sends email only after the owner confirms.</li>
          <li>Calendar: creates reminder events.</li>
          <li>Drive, Docs and Sheets: searches and reads the owner&apos;s files and creates new ones.</li>
          <li>Tasks: copies tasks from the app into Google Tasks.</li>
        </ul>

        <h2 className="mt-6 text-xl font-bold">Where data is stored</h2>
        <p className="mt-2">
          The owner&apos;s tasks, contacts, notes and Google access tokens are stored in the owner&apos;s own database. Access tokens are encrypted.
          Short pieces of text may be sent to an AI provider to file notes and write summaries.
        </p>

        <h2 className="mt-6 text-xl font-bold">Sharing</h2>
        <p className="mt-2">Data is not sold and is not shared with anyone else.</p>

        <h2 className="mt-6 text-xl font-bold">Removing access</h2>
        <p className="mt-2">
          The owner can remove the app&apos;s access at any time from the Google Account page, under Security, in the list of third-party apps.
        </p>
      </div>
    </main>
  );
}
