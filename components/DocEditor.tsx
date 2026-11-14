"use client";
// Editor for one note or opportunity: title, tags, optional status and rich text.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRow } from "@/app/actions";
import { saveDoc, type DocKind } from "@/app/doc-actions";
import { OPPORTUNITY_STATUSES } from "@/lib/db/schema-values";

const field = "rounded-[10px] border-[1.5px] border-ink bg-paper px-3 py-2";
const TOOLS: { label: string; title: string; command: string; value?: string; className?: string }[] = [
  { label: "B", title: "Bold", command: "bold", className: "font-extrabold" },
  { label: "I", title: "Italic", command: "italic", className: "italic" },
  { label: "U", title: "Underline", command: "underline", className: "underline" },
  { label: "H", title: "Heading", command: "formatBlock", value: "h2" },
  { label: "¶", title: "Normal text", command: "formatBlock", value: "p" },
  { label: "• List", title: "Bullet list", command: "insertUnorderedList" },
  { label: "1. List", title: "Numbered list", command: "insertOrderedList" },
];

export function DocEditor(props: { kind: DocKind; listHref: string; doc: { id: string; title: string; body: string; tags: string[]; status?: string } }) {
  const { kind, doc } = props;
  const router = useRouter();
  const bodyRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"saved" | "unsaved" | "error">("saved");
  const [pending, start] = useTransition();

  function save() {
    const data = new FormData(formRef.current!);
    start(async () => {
      const res = await saveDoc(kind, doc.id, {
        title: String(data.get("title")),
        tags: String(data.get("tags")),
        status: data.get("status") ? String(data.get("status")) : undefined,
        body: bodyRef.current?.innerHTML ?? "",
      });
      setState(res.ok ? "saved" : "error");
    });
  }

  return (
    <form
      ref={formRef}
      className="max-w-3xl"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onChange={() => setState("unsaved")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <a href={props.listHref} className="font-semibold underline">
          ← Back
        </a>
        <span className="ml-auto text-sm text-muted" role="status">
          {pending ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Could not save. Try again." : "Unsaved changes"}
        </span>
        <button type="submit" className="btn bg-mint" disabled={pending}>
          Save
        </button>
      </div>

      <input name="title" defaultValue={doc.title} aria-label="Title" className="mt-6 w-full bg-transparent text-4xl font-extrabold outline-none" onBlur={save} />

      <div className="mt-4 flex flex-wrap gap-3">
        <input name="tags" defaultValue={doc.tags.join(", ")} placeholder="Tags, separated by commas" aria-label="Tags" className={`${field} min-w-48 flex-1`} onBlur={save} />
        {kind === "opportunities" && (
          <select name="status" defaultValue={doc.status} aria-label="Status" className={field} onChange={save}>
            {OPPORTUNITY_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b-[1.5px] border-ink bg-lilac p-2" role="toolbar" aria-label="Formatting">
          {TOOLS.map((t) => (
            <button
              key={t.title}
              type="button"
              title={t.title}
              className={`rounded-md px-3 py-1 hover:bg-paper ${t.className ?? "font-semibold"}`}
              // Keep the text selection while clicking the toolbar.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                document.execCommand(t.command, false, t.value);
                setState("unsaved");
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div
          ref={bodyRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Text"
          className="rich min-h-72 p-5 outline-none"
          onInput={() => setState("unsaved")}
          onBlur={save}
          dangerouslySetInnerHTML={{ __html: doc.body }}
        />
      </div>

      <button
        type="button"
        className="mt-6 text-sm text-muted underline"
        onClick={() =>
          start(async () => {
            await deleteRow(kind, doc.id);
            router.push(props.listHref);
          })
        }
      >
        Move to Trash
      </button>
    </form>
  );
}
