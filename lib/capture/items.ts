// What the bot can file, the tool definitions sent to the model, and the pure
// mapping from a bot item to a database row. No database access in this file.
import { z } from "zod";
import type { ToolSpec } from "@/lib/ai/types";
import { CONTACT_KINDS, OUTREACH_STATUSES } from "@/lib/db/schema-values";

export const ITEM_TYPES = ["task", "reminder", "contact", "outreach_update", "note", "opportunity", "progress_log", "inbox"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const TYPE_INFO: Record<ItemType, { label: string; where: string; href: string; table: string }> = {
  task: { label: "Task", where: "Tasks", href: "/tasks", table: "tasks" },
  reminder: { label: "Reminder", where: "Tasks", href: "/tasks", table: "tasks" },
  contact: { label: "Contact", where: "Contacts", href: "/contacts", table: "contacts" },
  outreach_update: { label: "Outreach update", where: "Outreach", href: "/outreach", table: "outreach" },
  note: { label: "Note", where: "Notes", href: "/notes", table: "notes" },
  opportunity: { label: "Opportunity", where: "Opportunities", href: "/opportunities", table: "opportunities" },
  progress_log: { label: "Progress log", where: "Learning log", href: "/learning", table: "learning" },
  inbox: { label: "Inbox", where: "Inbox", href: "/inbox", table: "inbox" },
};

const optionalText = z.string().trim().max(2000).nullish().transform((v) => v || null);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(v)))
  .nullish()
  .transform((v) => v ?? null)
  .catch(null); // a malformed date is dropped rather than failing the whole message

export const itemSchema = z.object({
  type: z.enum(ITEM_TYPES),
  title: z.string().trim().min(1).max(200),
  details: optionalText,
  date: isoDate,
  time: z.string().regex(/^\d{2}:\d{2}$/).nullish().transform((v) => v ?? null).catch(null),
  person: optionalText,
  firm: optionalText,
  phone: optionalText,
  email: optionalText,
  hours: z.number().min(0).max(24).nullish().transform((v) => v ?? null).catch(null),
  outreach_status: z.enum(OUTREACH_STATUSES).nullish().transform((v) => v ?? null).catch(null),
  contact_kind: z.enum(CONTACT_KINDS).nullish().transform((v) => v ?? null).catch(null),
  tags: optionalText,
  question: optionalText,
});
export type Item = z.infer<typeof itemSchema>;
export const fileItemsSchema = z.object({ items: z.array(itemSchema).min(1).max(12) });

export const QUERY_TABLES = ["tasks", "outreach", "contacts", "notes", "opportunities", "learning", "deliverables", "plan_items"] as const;
export const queryDataSchema = z.object({
  table: z.enum(QUERY_TABLES),
  search: z.string().trim().max(100).nullish().transform((v) => v || null),
});

export const TOOLS: ToolSpec[] = [
  {
    name: "file_items",
    description: "File everything the user's message contains. Call this once with one entry per separate thing. Use type 'inbox' with one short question when you cannot tell what something is.",
    input: {
      fields: {
        items: {
          type: "array",
          description: "One entry per separate thing in the message",
          items: {
            fields: {
              type: {
                type: "string",
                enum: ITEM_TYPES,
                description:
                  "task = something to do. reminder = something to do or follow up on at a specific date. contact = a person the user met or should remember. outreach_update = news about a firm or person in the outreach list (replied, call booked, sent, dead). note = an idea or lesson to keep. opportunity = information that may be profitable later, such as a business for sale. progress_log = study or work time already done. inbox = unclear.",
              },
              title: { type: "string", description: "Short clean summary in English, typos fixed. For a contact: the person's name. For an outreach_update: what happened." },
              details: { type: "string", optional: true, description: "Anything else worth keeping, in the user's meaning. For a contact: how they met and what the person does." },
              date: { type: "string", optional: true, description: "YYYY-MM-DD. Due date for a task or reminder, or the day of a progress_log. Work out words like tomorrow, kal, parso, next Monday from today's date." },
              time: { type: "string", optional: true, description: "HH:MM in 24-hour time, only if the user gave a time" },
              person: { type: "string", optional: true, description: "Person's name, for contact and outreach_update" },
              firm: { type: "string", optional: true, description: "Firm or company name. For outreach_update copy the name from the outreach list when it matches." },
              phone: { type: "string", optional: true, description: "Phone number exactly as written" },
              email: { type: "string", optional: true, description: "Email address" },
              hours: { type: "number", optional: true, description: "Hours spent, for progress_log" },
              outreach_status: { type: "string", optional: true, enum: OUTREACH_STATUSES, description: "New status for an outreach_update" },
              contact_kind: { type: "string", optional: true, enum: CONTACT_KINDS, description: "For a contact: owner = runs a local business; alumni; banker; CA; other" },
              tags: { type: "string", optional: true, description: "1 to 3 short lowercase tags separated by commas, for note and opportunity" },
              question: { type: "string", optional: true, description: "For inbox only: one short question to ask the user" },
            },
          },
        },
      },
    },
  },
  {
    name: "query_data",
    description: "Read the user's own saved data to answer a question about it. Returns up to 40 rows.",
    input: {
      fields: {
        table: { type: "string", enum: QUERY_TABLES, description: "Which table to read" },
        search: { type: "string", optional: true, description: "Optional text to look for. Leave empty to get the most recent rows." },
      },
    },
  },
];

export function systemPrompt(ctx: { today: string; weekday: string; firms: string[] }): string {
  return [
    "You are the capture bot inside Journey HQ, a private app for one student starting a career in dealmaking in India.",
    `Today is ${ctx.weekday} ${ctx.today} (India time).`,
    "The user types quick, messy notes, often with typos or in Hinglish (Hindi written in English letters, for example 'kal' = tomorrow, 'parso' = day after tomorrow, 'ghante' = hours, 'mila' = met).",
    "If the message reports things that happened or need doing, call file_items once and include every separate thing in it. One message often holds several items.",
    "If the message is a question about the user's own data, call query_data for what you need, then answer in one to three short sentences. Do not file anything for a question.",
    "If you cannot tell what something is, file it with type inbox and ask one short question. Never invent names, dates, numbers or firms that the user did not give.",
    ctx.firms.length > 0 ? `Firms already in the outreach list: ${ctx.firms.join("; ")}.` : "The outreach list is empty.",
  ].join("\n");
}

// ---- Bot item -> database row (pure) ----
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type RowPlan = { table: "tasks" | "contacts" | "outreach" | "notes" | "opportunities" | "learning" | "inbox"; values: Record<string, unknown>; label: string };

export function toRow(item: Item, today: string): RowPlan {
  const tags = (item.tags ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5);
  switch (item.type) {
    case "task":
      return { table: "tasks", label: item.title, values: { title: item.title, dueDate: item.date, notes: item.details } };
    case "reminder": {
      const date = item.date ?? today;
      // Stored as India time (UTC+05:30); 9 am when no time was given.
      const remindAt = new Date(`${date}T${item.time ?? "09:00"}:00+05:30`);
      return { table: "tasks", label: item.title, values: { title: item.title, dueDate: date, isReminder: true, remindAt, notes: item.details } };
    }
    case "contact": {
      const name = item.person ?? item.title;
      return {
        table: "contacts",
        label: name,
        values: { name, kind: item.contact_kind ?? "other", firm: item.firm, phone: item.phone, email: item.email, howMet: item.details, lastContact: today },
      };
    }
    case "outreach_update":
      return {
        table: "outreach",
        label: `${item.firm ?? item.person ?? item.title}${item.outreach_status ? `: ${item.outreach_status}` : ""}`,
        values: { firm: item.firm ?? item.person ?? item.title, person: item.person, email: item.email, status: item.outreach_status, note: item.details && item.details.toLowerCase().includes(item.title.toLowerCase()) ? item.details : [item.title, item.details].filter(Boolean).join(". ") },
      };
    case "note":
    case "opportunity":
      return { table: item.type === "note" ? "notes" : "opportunities", label: item.title, values: { title: item.title, body: `<p>${escapeHtml(item.details ?? item.title)}</p>`, tags } };
    case "progress_log":
      return { table: "learning", label: `${item.title}${item.hours ? ` (${item.hours} h)` : ""}`, values: { date: item.date ?? today, topic: item.title, hours: item.hours ?? 0, learned: item.details } };
    case "inbox":
      return { table: "inbox", label: item.title, values: { rawText: item.details ?? item.title, question: item.question ?? "What should I do with this?" } };
  }
}
