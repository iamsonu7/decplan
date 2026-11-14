// Tests for the capture bot that need no AI key and no database.
import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "@/lib/ai";
import { fakeProvider } from "@/lib/ai/fake";
import { toGeminiSchema, toStrictJsonSchema } from "@/lib/ai/schema";
import type { AIProvider, AIResult } from "@/lib/ai/types";
import { runBot } from "@/lib/capture/bot";
import { itemSchema, TOOLS, toRow } from "@/lib/capture/items";

const ctx = { today: "2026-12-03", weekday: "Thursday", firms: ["XYZ Capital"], runQuery: async () => [{ firm: "XYZ Capital", status: "sent" }] };
const blank = { details: null, date: null, time: null, person: null, firm: null, phone: null, email: null, hours: null, outreach_status: null, contact_kind: null, tags: null, question: null };

// A provider that replays prepared replies.
function scripted(replies: Partial<AIResult>[]): AIProvider & { calls: number } {
  const p = {
    id: "fake",
    model: "scripted",
    calls: 0,
    async generate() {
      const r = replies[p.calls++];
      return { text: "", toolCalls: [], payload: null, usage: { inputTokens: 10, outputTokens: 5 }, ...r };
    },
  };
  return p;
}

describe("tool schemas", () => {
  const strict = toStrictJsonSchema(TOOLS[0].input) as { properties: { items: { items: { properties: Record<string, { type: unknown; enum?: unknown[] }>; required: string[]; additionalProperties: boolean } } } };
  const item = strict.properties.items.items;
  it("strict schema requires every field and forbids extras", () => {
    expect(item.additionalProperties).toBe(false);
    expect(item.required.sort()).toEqual(Object.keys(item.properties).sort());
    expect(item.properties.title.type).toBe("string");
    expect(item.properties.date.type).toEqual(["string", "null"]);
    expect(item.properties.outreach_status.enum).toContain(null);
  });
  it("Gemini schema marks only type and title as required", () => {
    const g = toGeminiSchema(TOOLS[0].input) as { properties: { items: { items: { required: string[]; properties: Record<string, { nullable?: boolean }> } } } };
    expect(g.properties.items.items.required).toEqual(["type", "title"]);
    expect(g.properties.items.items.properties.hours.nullable).toBe(true);
  });
});

describe("bot loop", () => {
  it("files several items from one message with a single AI call", async () => {
    const p = scripted([
      {
        toolCalls: [
          {
            id: "1",
            name: "file_items",
            args: { items: [{ ...blank, type: "progress_log", title: "Balance sheet", hours: 3 }, { ...blank, type: "task", title: "Finish cash flow section", date: "2026-12-04" }] },
          },
        ],
      },
    ]);
    const res = await runBot(p, "did 3 hrs on balance sheet, need to finish cash flow tmrw", ctx);
    expect(res.items.map((i) => i.type)).toEqual(["progress_log", "task"]);
    expect(p.calls).toBe(1);
    expect(res.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it("answers a question after reading data, without filing", async () => {
    const p = scripted([{ toolCalls: [{ id: "1", name: "query_data", args: { table: "outreach", search: null } }] }, { text: "You have not followed up with XYZ Capital." }]);
    const res = await runBot(p, "who haven't I followed up with?", ctx);
    expect(res.items).toEqual([]);
    expect(res.answer).toContain("XYZ Capital");
    expect(p.calls).toBe(2);
  });

  it("asks the model to retry when its tool input is invalid", async () => {
    const p = scripted([
      { toolCalls: [{ id: "1", name: "file_items", args: { items: [{ type: "banana", title: "x" }] } }] },
      { toolCalls: [{ id: "2", name: "file_items", args: { items: [{ ...blank, type: "note", title: "x" }] } }] },
    ]);
    const res = await runBot(p, "x", ctx);
    expect(res.items).toHaveLength(1);
    expect(p.calls).toBe(2);
  });

  it("drops a malformed date instead of failing", () => {
    expect(itemSchema.parse({ type: "task", title: "Call", date: "5 Jan" }).date).toBeNull();
  });

  it("the keyword stand-in splits lines and picks types", async () => {
    const res = await runBot(fakeProvider, "XYZ Capital replied, wants my memo\ndid 3 hours on balance sheet", ctx);
    expect(res.items.map((i) => i.type)).toEqual(["outreach_update", "progress_log"]);
  });
});

describe("item to database row", () => {
  const make = (over: Record<string, unknown>) => itemSchema.parse({ type: "task", title: "T", ...over });
  it("task and reminder go to tasks; a reminder gets a 9 am India time", () => {
    expect(toRow(make({ date: "2026-12-04" }), "2026-12-03")).toMatchObject({ table: "tasks", values: { title: "T", dueDate: "2026-12-04" } });
    const r = toRow(make({ type: "reminder", date: "2027-01-05" }), "2026-12-03");
    expect(r.values.isReminder).toBe(true);
    expect((r.values.remindAt as Date).toISOString()).toBe("2027-01-05T03:30:00.000Z");
  });
  it("contact uses the person's name and today's date", () => {
    const r = toRow(make({ type: "contact", title: "Met Rohan", person: "Rohan", phone: "98xxxx", details: "runs a small advisory in Indore" }), "2026-12-03");
    expect(r).toMatchObject({ table: "contacts", label: "Rohan", values: { name: "Rohan", phone: "98xxxx", kind: "other", lastContact: "2026-12-03" } });
  });
  it("note text is escaped so it cannot inject HTML", () => {
    const r = toRow(make({ type: "note", title: "DCF", details: "<script>x</script> terminal value", tags: "DCF, Valuation" }), "2026-12-03");
    expect(r.values.body).toBe("<p>&lt;script&gt;x&lt;/script&gt; terminal value</p>");
    expect(r.values.tags).toEqual(["dcf", "valuation"]);
  });
  it("progress log defaults to today", () => {
    expect(toRow(make({ type: "progress_log", title: "Balance sheet", hours: 3 }), "2026-12-03")).toMatchObject({ table: "learning", values: { date: "2026-12-03", hours: 3 } });
  });
});

describe("cost estimate", () => {
  it("prices Anthropic Haiku and treats Gemini as free", () => {
    expect(estimateCostUsd("anthropic", { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(0.6);
    expect(estimateCostUsd("gemini", { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBe(0);
  });
});
