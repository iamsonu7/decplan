// Allowed values for the select columns. Kept apart from schema.ts so that
// browser code can import them without pulling in the database library.
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
