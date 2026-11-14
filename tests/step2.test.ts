import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import { addDays, dayRange, streak, weekStart } from "@/lib/dates";
import { cleanHtml, htmlToText } from "@/lib/html";
import { decemberPlan } from "@/lib/seed-plan";
import { coerceValue, TABLE_CONFIG } from "@/lib/tables/config";

describe("dates", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(dayRange("2026-12-02", "2026-12-05")).toHaveLength(4);
  });
  it("finds the Monday of a week", () => {
    expect(weekStart("2026-12-06")).toBe("2026-11-30"); // Sunday
    expect(weekStart("2026-12-07")).toBe("2026-12-07"); // Monday
  });
  it("counts the streak, allowing today to be not logged yet", () => {
    expect(streak(["2026-12-01", "2026-12-02", "2026-12-03"], "2026-12-03")).toBe(3);
    expect(streak(["2026-12-01", "2026-12-02"], "2026-12-03")).toBe(2);
    expect(streak(["2026-12-01"], "2026-12-03")).toBe(0);
  });
});

describe("December plan seed", () => {
  const seed = decemberPlan(2026);
  const all = [...seed.blocks.flatMap((b) => b.items), ...seed.running];
  it("has 4 blocks covering Dec 1 to 26 with an item on every day", () => {
    expect(seed.blocks).toHaveLength(4);
    const blockDays = new Set(seed.blocks.flatMap((b) => b.items.map((i) => i.date)));
    expect([...blockDays].sort()).toEqual(dayRange("2026-12-01", "2026-12-26"));
  });
  it("keeps every item inside its block and the plan", () => {
    for (const b of seed.blocks) for (const i of b.items) expect(i.date >= b.startDate && i.date <= b.endDate).toBe(true);
    for (const i of all) expect(i.date >= seed.plan.startDate && i.date <= seed.plan.endDate).toBe(true);
  });
  it("has the running-alongside items", () => {
    expect(seed.running.filter((i) => i.title.startsWith("Add 3 names"))).toHaveLength(20);
    expect(seed.running.filter((i) => i.title.startsWith("Talk to a local business owner"))).toHaveLength(5);
    expect(seed.running.filter((i) => i.title === "Weekly review").map((i) => i.date)).toEqual(["2026-12-06", "2026-12-13", "2026-12-20"]);
  });
  it("has the scorecard targets", () => {
    expect(seed.plan.targets).toEqual({ breakdown: 1, model: 1, memo: 1, emails: 50, alumniMessages: 10, ownerConversations: 5 });
  });
});

describe("cell values", () => {
  const col = (table: keyof typeof TABLE_CONFIG, key: string) => TABLE_CONFIG[table].columns.find((c) => c.key === key)!;
  it("accepts allowed select values and rejects others", () => {
    expect(coerceValue(col("outreach", "status"), "replied")).toBe("replied");
    expect(() => coerceValue(col("outreach", "status"), "hacked")).toThrow();
  });
  it("requires required fields and empties optional ones", () => {
    expect(() => coerceValue(col("outreach", "firm"), "  ")).toThrow();
    expect(coerceValue(col("outreach", "person"), "  ")).toBeNull();
  });
  it("checks dates, numbers and links", () => {
    expect(coerceValue(col("tasks", "dueDate"), "2026-12-05")).toBe("2026-12-05");
    expect(() => coerceValue(col("tasks", "dueDate"), "5 Dec")).toThrow();
    expect(coerceValue(col("learning", "hours"), "2.5")).toBe(2.5);
    expect(() => coerceValue(col("learning", "hours"), "-1")).toThrow();
    expect(() => coerceValue(col("deliverables", "driveUrl"), "javascript:alert(1)")).toThrow();
  });
  it("cleans tags", () => {
    expect(coerceValue(col("notes", "tags"), "DCF, valuation ,dcf,")).toEqual(["dcf", "valuation"]);
  });
});

describe("rich text and export", () => {
  it("removes scripts and unsafe links but keeps formatting", () => {
    const out = cleanHtml('<p onclick="x()">Hi <b>there</b><script>alert(1)</script><a href="javascript:x">l</a></p>');
    expect(out).toBe("<p>Hi <b>there</b><a>l</a></p>");
    expect(htmlToText("<h2>DCF</h2><p>terminal &amp; value</p>")).toBe("DCF terminal & value");
  });
  it("writes safe CSV", () => {
    expect(toCsv([{ a: 'say "hi", ok', b: "=SUM(A1)", c: ["x", "y"] }])).toBe('a,b,c\r\n"say ""hi"", ok",\'=SUM(A1),"x, y"');
  });
});
