// Describes each database page: its columns, how they are edited and which
// column the board view groups by. Safe to import from client components.
import {
  CONTACT_KINDS,
  DELIVERABLE_STATUSES,
  OPPORTUNITY_STATUSES,
  OUTREACH_STATUSES,
  OUTREACH_TYPES,
  TASK_STATUSES,
} from "@/lib/db/schema-values";

export type ColumnType = "text" | "longtext" | "date" | "number" | "select" | "checkbox" | "url" | "tags";

export type Column = {
  key: string; // property name in lib/db/schema.ts
  label: string;
  type: ColumnType;
  options?: readonly string[];
  required?: boolean;
};

export type TableConfig = {
  label: string;
  singular: string;
  columns: Column[];
  boardBy?: string; // select column used for the board view
  page: boolean; // shown as a generic table page at /<key>
  href: string;
};

export const TABLE_CONFIG = {
  tasks: {
    label: "Tasks",
    singular: "task",
    page: true,
    href: "/tasks",
    boardBy: "status",
    columns: [
      { key: "title", label: "Task", type: "text", required: true },
      { key: "dueDate", label: "Due", type: "date" },
      { key: "status", label: "Status", type: "select", options: TASK_STATUSES },
      { key: "isReminder", label: "Reminder", type: "checkbox" },
      { key: "notes", label: "Notes", type: "longtext" },
    ],
  },
  outreach: {
    label: "Outreach",
    singular: "outreach row",
    page: true,
    href: "/outreach",
    boardBy: "status",
    columns: [
      { key: "firm", label: "Firm", type: "text", required: true },
      { key: "person", label: "Person", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "type", label: "Type", type: "select", options: OUTREACH_TYPES },
      { key: "status", label: "Status", type: "select", options: OUTREACH_STATUSES },
      { key: "dateSent", label: "Date sent", type: "date" },
      { key: "followUpDate", label: "Follow-up", type: "date" },
      { key: "gmailThreadId", label: "Gmail thread", type: "text" },
      { key: "notes", label: "Notes", type: "longtext" },
    ],
  },
  contacts: {
    label: "Contacts",
    singular: "contact",
    page: true,
    href: "/contacts",
    boardBy: "kind",
    columns: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "kind", label: "Kind", type: "select", options: CONTACT_KINDS },
      { key: "firm", label: "Firm", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "howMet", label: "How we met", type: "text" },
      { key: "lastContact", label: "Last contact", type: "date" },
      { key: "nextStep", label: "Next step", type: "text" },
      { key: "notes", label: "Notes", type: "longtext" },
    ],
  },
  deliverables: {
    label: "Deliverables",
    singular: "deliverable",
    page: true,
    href: "/deliverables",
    boardBy: "status",
    columns: [
      { key: "name", label: "Deliverable", type: "text", required: true },
      { key: "status", label: "Status", type: "select", options: DELIVERABLE_STATUSES },
      { key: "driveUrl", label: "Google Drive link", type: "url" },
      { key: "notes", label: "Notes", type: "longtext" },
    ],
  },
  learning: {
    label: "Learning log",
    singular: "log entry",
    page: true,
    href: "/learning",
    columns: [
      { key: "date", label: "Date", type: "date", required: true },
      { key: "topic", label: "Topic", type: "text", required: true },
      { key: "hours", label: "Hours", type: "number" },
      { key: "learned", label: "What I learned", type: "longtext" },
    ],
  },
  notes: {
    label: "Notes",
    singular: "note",
    page: false,
    href: "/notes",
    columns: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "tags", label: "Tags", type: "tags" },
    ],
  },
  opportunities: {
    label: "Opportunities",
    singular: "opportunity",
    page: false,
    href: "/opportunities",
    columns: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "tags", label: "Tags", type: "tags" },
      { key: "status", label: "Status", type: "select", options: OPPORTUNITY_STATUSES },
    ],
  },
  planItems: {
    label: "Plan items",
    singular: "plan item",
    page: false,
    href: "/plan",
    columns: [
      { key: "title", label: "Item", type: "text", required: true },
      { key: "date", label: "Date", type: "date", required: true },
    ],
  },
} satisfies Record<string, TableConfig>;

export type TableKey = keyof typeof TABLE_CONFIG;

export function isTableKey(key: string): key is TableKey {
  return Object.prototype.hasOwnProperty.call(TABLE_CONFIG, key);
}

export function getTableConfig(key: TableKey): TableConfig {
  return TABLE_CONFIG[key];
}

export function parseTags(raw: string): string[] {
  return [...new Set(raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

// Turns whatever the browser sent into a clean value for the database.
// Throws an Error with a message the user can read when the value is not allowed.
export function coerceValue(col: Column, raw: unknown): string | number | boolean | string[] | null {
  if (col.type === "checkbox") return raw === true || raw === "true";
  if (col.type === "tags") return Array.isArray(raw) ? parseTags(raw.join(",")) : parseTags(String(raw ?? ""));

  const text = typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw).trim();
  if (text === "") {
    if (col.required) throw new Error(`${col.label} cannot be empty.`);
    return col.type === "number" ? 0 : null;
  }
  switch (col.type) {
    case "date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) throw new Error(`${col.label} must be a date.`);
      return text;
    case "number": {
      const n = Number(text);
      if (!Number.isFinite(n) || n < 0 || n > 99) throw new Error(`${col.label} must be a number between 0 and 99.`);
      return Math.round(n * 100) / 100;
    }
    case "select":
      if (!col.options?.includes(text)) throw new Error(`${col.label} must be one of: ${col.options?.join(", ")}.`);
      return text;
    case "url":
      if (!/^https?:\/\//i.test(text)) throw new Error(`${col.label} must start with http:// or https://.`);
      return text;
    default:
      return text.slice(0, 5000);
  }
}
