"use client";
// The capture bot's chat box. Opens from any page with Ctrl+K or "/".
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { capture, changeCardType, undoCard, type Card } from "@/app/capture-actions";
import { ITEM_TYPES, TYPE_INFO } from "@/lib/capture/items";

type Entry = { id: number; message: string; reply?: string; cards: Card[]; error?: string; pending: boolean };
const TYPE_COLOURS: Record<string, string> = {
  task: "bg-sky",
  reminder: "bg-butter",
  contact: "bg-lilac",
  outreach_update: "bg-mint",
  note: "bg-butter",
  opportunity: "bg-mint",
  progress_log: "bg-sky",
  inbox: "bg-peach",
};

export const OPEN_CAPTURE_EVENT = "journey:open-capture";

export function CaptureBox() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [answering, setAnswering] = useState<Card | null>(null);
  const [, start] = useTransition();
  const busy = entries.some((e) => e.pending);

  useEffect(() => {
    const open = () => {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      inputRef.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      } else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_CAPTURE_EVENT, open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_CAPTURE_EVENT, open);
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [entries]);

  function send() {
    const message = text.trim();
    if (!message || busy) return;
    const id = Date.now();
    const inboxId = answering?.inboxId;
    setEntries((list) => [...list, { id, message, cards: [], pending: true }]);
    setText("");
    setAnswering(null);
    start(async () => {
      const res = await capture(message, inboxId);
      setEntries((list) => list.map((e) => (e.id === id ? (res.ok ? { ...e, pending: false, reply: res.reply, cards: res.cards } : { ...e, pending: false, error: res.error }) : e)));
    });
  }

  function replaceCard(next: Card) {
    setEntries((list) => list.map((e) => ({ ...e, cards: e.cards.map((c) => (c.captureId === next.captureId && c.index === next.index ? next : c)) })));
  }

  function cardAction(entryId: number, fn: () => Promise<{ ok: true; card: Card } | { ok: false; error: string }>) {
    start(async () => {
      const res = await fn();
      if (res.ok) replaceCard(res.card);
      else setEntries((list) => list.map((e) => (e.id === entryId ? { ...e, error: res.error } : e)));
    });
  }

  return (
    <dialog ref={dialogRef} className="card m-auto w-[min(94vw,40rem)] p-0 backdrop:bg-ink/30" aria-label="Capture">
      <div className="flex items-center justify-between border-b-[1.5px] border-ink bg-mint px-5 py-3">
        <h2 className="text-xl font-extrabold">Capture</h2>
        <button type="button" className="rounded-md px-2 py-1 font-semibold hover:bg-paper" onClick={() => dialogRef.current?.close()}>
          Close (Esc)
        </button>
      </div>

      <div ref={logRef} className="max-h-[50vh] overflow-y-auto px-5 py-4" aria-live="polite">
        {entries.length === 0 && (
          <p className="text-muted">
            Type what happened, in any words. For example: <em>met Rohan, runs a small advisory in Indore. did 3 hours on balance sheet. follow up with XYZ Capital on 5 Jan</em>. You can also ask about your own data.
          </p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="mb-5">
            <p className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-[14px] border-[1.5px] border-ink bg-sky px-3 py-2">{e.message}</p>
            {e.pending && <p className="mt-2 text-muted">Filing…</p>}
            {e.error && (
              <p role="alert" className="mt-2 rounded-lg border-[1.5px] border-ink bg-peach px-3 py-2 font-semibold">
                {e.error}
              </p>
            )}
            {e.reply && <p className="mt-2 whitespace-pre-wrap">{e.reply}</p>}
            <div className="mt-2 grid gap-2">
              {e.cards.map((c) => (
                <div key={`${c.captureId}:${c.index}`} className={`rounded-[10px] border-[1.5px] border-ink bg-paper p-3 ${c.undone ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`pill ${TYPE_COLOURS[c.type]}`}>{c.typeLabel}</span>
                    <span className={`min-w-0 flex-1 font-semibold ${c.undone ? "line-through" : ""}`}>{c.label}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    {c.undone ? (
                      <span className="text-muted">Undone</span>
                    ) : (
                      <>
                        <span className="text-muted">
                          {c.action === "updated" ? "Updated in" : "Created in"}{" "}
                          <Link href={c.href} className="font-semibold underline" onClick={() => dialogRef.current?.close()}>
                            {c.where}
                          </Link>
                        </span>
                        <button type="button" className="font-semibold underline" onClick={() => cardAction(e.id, () => undoCard(c.captureId, c.index))}>
                          Undo
                        </button>
                        {c.type === "inbox" && (
                          <button
                            type="button"
                            className="font-semibold underline"
                            onClick={() => {
                              setAnswering(c);
                              inputRef.current?.focus();
                            }}
                          >
                            Answer
                          </button>
                        )}
                      </>
                    )}
                    <label className="ml-auto flex items-center gap-1 text-muted">
                      Change type
                      <select
                        aria-label="Change type"
                        className="rounded-md border border-ink/40 bg-paper px-1 py-0.5 text-ink"
                        value={c.type}
                        onChange={(ev) => cardAction(e.id, () => changeCardType(c.captureId, c.index, ev.target.value))}
                      >
                        {ITEM_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_INFO[t].label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form
        className="border-t-[1.5px] border-ink p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        {answering && (
          <p className="mb-2 flex items-center gap-2 text-sm">
            <span className="pill bg-peach">Answering</span>
            <span className="min-w-0 flex-1 truncate">{answering.question}</span>
            <button type="button" className="underline" onClick={() => setAnswering(null)}>
              Cancel
            </button>
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="What happened? (Enter to send, Shift+Enter for a new line)"
            aria-label="Message"
            className="min-w-0 flex-1 resize-none rounded-[10px] border-[1.5px] border-ink bg-paper px-3 py-2"
          />
          <button type="submit" className="btn bg-mint" disabled={busy || !text.trim()}>
            {busy ? "…" : "Send"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

// A button that opens the capture box from anywhere.
export function CaptureButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CAPTURE_EVENT))}>
      {children}
    </button>
  );
}
