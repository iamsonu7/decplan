// The whole data model for Journey HQ.
// After changing this file run:  npm run db:generate  then  npm run db:migrate
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Columns every table shares. deleted_at is a soft delete: Undo and normal
// deletes set it, and only a confirmed "delete permanently" removes the row.
const base = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

// ---- Allowed values (kept as plain text in the database, typed here) ----
export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export const OUTREACH_TYPES = ["boutique bank", "CA firm", "fund", "alumni"] as const;
export const OUTREACH_STATUSES = ["to send", "sent", "replied", "call booked", "dead"] as const;
export const CONTACT_KINDS = ["owner", "alumni", "banker", "CA", "other"] as const;
export const OPPORTUNITY_STATUSES = ["open", "pursuing", "dropped"] as const;
export const DELIVERABLE_STATUSES = ["not started", "in progress", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type OutreachType = (typeof OUTREACH_TYPES)[number];
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];
export type ContactKind = (typeof CONTACT_KINDS)[number];
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

// A pointer to a row in any table, e.g. { table: "tasks", id: "..." }
export type ItemRef = { table: string; id: string };

// ---- Google connection (one row: only ALLOWED_EMAIL can sign in) ----
export const googleTokens = pgTable("google_tokens", {
  email: text("email").primaryKey(),
  refreshTokenEnc: text("refresh_token_enc").notNull(), // encrypted
  accessTokenEnc: text("access_token_enc"), // encrypted, short-lived
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  scopes: text("scopes").notNull().default(""), // space-separated scopes Google granted
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- Plan ----
export const plans = pgTable("plans", {
  ...base,
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  // Scorecard targets, e.g. { emails: 50, alumniMessages: 10 }
  targets: jsonb("targets").$type<Record<string, number>>().notNull().default({}),
});

export const planBlocks = pgTable("plan_blocks", {
  ...base,
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  output: text("output"), // what the block should produce
});

// One row per day, so each day can be ticked off.
// blockId is empty for "running alongside" items.
export const planItems = pgTable("plan_items", {
  ...base,
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  blockId: uuid("block_id").references(() => planBlocks.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  title: text("title").notNull(),
  doneAt: timestamp("done_at", { withTimezone: true }),
});

// ---- Tasks and reminders ----
export const tasks = pgTable("tasks", {
  ...base,
  title: text("title").notNull(),
  notes: text("notes"),
  dueDate: date("due_date"),
  status: text("status").$type<TaskStatus>().notNull().default("todo"),
  isReminder: boolean("is_reminder").notNull().default(false),
  remindAt: timestamp("remind_at", { withTimezone: true }),
  googleTaskId: text("google_task_id"),
  calendarEventId: text("calendar_event_id"),
  outreachId: uuid("outreach_id"),
  contactId: uuid("contact_id"),
});

// ---- Contacts and outreach ----
export const contacts = pgTable("contacts", {
  ...base,
  name: text("name").notNull(),
  kind: text("kind").$type<ContactKind>().notNull().default("other"),
  firm: text("firm"),
  phone: text("phone"),
  email: text("email"),
  howMet: text("how_met"),
  lastContact: date("last_contact"),
  nextStep: text("next_step"),
  notes: text("notes"),
});

export const outreach = pgTable("outreach", {
  ...base,
  firm: text("firm").notNull(),
  person: text("person"),
  role: text("role"),
  email: text("email"),
  type: text("type").$type<OutreachType>().notNull().default("boutique bank"),
  status: text("status").$type<OutreachStatus>().notNull().default("to send"),
  dateSent: date("date_sent"),
  followUpDate: date("follow_up_date"),
  gmailThreadId: text("gmail_thread_id"),
  notes: text("notes"),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
});

// ---- Notes and opportunities ----
export const notes = pgTable("notes", {
  ...base,
  title: text("title").notNull(),
  body: text("body").notNull().default(""), // rich text stored as HTML
  tags: text("tags").array().notNull().default([]),
});

export const opportunities = pgTable("opportunities", {
  ...base,
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  tags: text("tags").array().notNull().default([]),
  status: text("status").$type<OpportunityStatus>().notNull().default("open"),
});

// ---- Deliverables and learning ----
export const deliverables = pgTable("deliverables", {
  ...base,
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  status: text("status").$type<DeliverableStatus>().notNull().default("not started"),
  driveFileId: text("drive_file_id"),
  driveUrl: text("drive_url"),
  notes: text("notes"),
});

export const learningLog = pgTable("learning_log", {
  ...base,
  date: date("date").notNull(),
  topic: text("topic").notNull(),
  hours: numeric("hours", { precision: 4, scale: 2, mode: "number" }).notNull().default(0),
  learned: text("learned"),
});

export const weeklyReviews = pgTable("weekly_reviews", {
  ...base,
  weekStart: date("week_start").notNull().unique(), // the Monday of that week
  summary: text("summary").notNull().default(""),
  scorecard: jsonb("scorecard").$type<Record<string, number>>().notNull().default({}),
});

// ---- Capture bot ----
export const captures = pgTable("captures", {
  ...base,
  rawText: text("raw_text").notNull(),
  reply: text("reply"),
  createdItems: jsonb("created_items").$type<ItemRef[]>().notNull().default([]),
});

export const inboxItems = pgTable("inbox_items", {
  ...base,
  captureId: uuid("capture_id").references(() => captures.id, { onDelete: "set null" }),
  rawText: text("raw_text").notNull(),
  question: text("question"), // the one short question the bot asked
  resolvedInto: jsonb("resolved_into").$type<ItemRef | null>(),
});

// ---- Logs and settings ----
// Every action the bot takes on the Google account.
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  service: text("service").notNull(), // gmail, calendar, drive, docs, sheets, tasks, script
  action: text("action").notNull(), // e.g. "create event"
  target: text("target"), // id or link of the Google object
  summary: text("summary"), // short description of the content
  confirmedByUser: boolean("confirmed_by_user").notNull().default(false),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  purpose: text("purpose"), // capture, question, weekly review, email summary
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
