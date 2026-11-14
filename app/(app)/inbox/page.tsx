import { desc, isNull } from "drizzle-orm";
import { requireUser } from "@/auth";
import { CaptureButton } from "@/components/CaptureBox";
import { InboxRow } from "@/components/InboxList";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";

export default async function InboxPage() {
  await requireUser();
  const rows = await db.select().from(inboxItems).where(isNull(inboxItems.deletedAt)).orderBy(desc(inboxItems.createdAt));

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-extrabold">Inbox</h1>
      <p className="mt-2 text-muted">Things the bot was not sure about. File each one yourself, or answer the bot&apos;s question in the capture box.</p>
      <p className="mt-4">
        <CaptureButton className="btn bg-mint">Open capture (Ctrl+K)</CaptureButton>
      </p>
      <section className="card mt-6 p-5">
        {rows.length === 0 ? (
          <p className="text-muted">The Inbox is empty.</p>
        ) : (
          <ul className="divide-y divide-ink/15">
            {rows.map((r) => (
              <InboxRow key={r.id} id={r.id} rawText={r.rawText} question={r.question} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
