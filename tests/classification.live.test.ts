// Sends real example messages to the configured AI and checks how each is filed.
// Run with:  npm run test:ai   (needs an AI key in .env.local; uses about 24 requests)
import { describe, expect, it } from "vitest";
import { getProvider, providerName } from "@/lib/ai";
import { runBot } from "@/lib/capture/bot";
import type { ItemType } from "@/lib/capture/items";

try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local: use variables already in the environment
}

const hasKey = providerName() === "anthropic" ? Boolean(process.env.ANTHROPIC_API_KEY) : Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL);
const ctx = {
  today: "2026-12-03", // a Thursday
  weekday: "Thursday",
  firms: ["XYZ Capital", "Sharma & Associates", "Indore Growth Partners", "Malwa Advisors"],
  runQuery: async () => [
    { firm: "XYZ Capital", status: "sent", dateSent: "2026-11-20" },
    { firm: "Malwa Advisors", status: "replied", dateSent: "2026-11-22" },
  ],
};

type Case = { message: string; types: ItemType[]; check?: (items: Awaited<ReturnType<typeof runBot>>["items"]) => void };
const CASES: Case[] = [
  // The seven examples from the spec
  { message: "need to finish cash flow section tomorrow", types: ["task"], check: (i) => expect(i[0].date).toBe("2026-12-04") },
  { message: "follow up with the Indore CA firm on 5 Jan", types: ["reminder"], check: (i) => expect(i[0].date).toBe("2027-01-05") },
  { message: "met Rohan, runs a small advisory in Indore, 98xxxx", types: ["contact"], check: (i) => expect(`${i[0].person} ${i[0].title}`).toMatch(/Rohan/) },
  { message: "XYZ Capital replied, wants my memo", types: ["outreach_update"], check: (i) => expect(i[0].outreach_status).toBe("replied") },
  { message: "DCF terminal value = most of the value, check assumptions", types: ["note"] },
  { message: "local dal mill owner wants to sell in 2 years", types: ["opportunity"] },
  { message: "did 3 hours on balance sheet today", types: ["progress_log"], check: (i) => expect(i[0].hours).toBe(3) },
  // Typos
  { message: "ned to finsh the incme statment by friday", types: ["task"], check: (i) => expect(i[0].date).toBe("2026-12-04") },
  { message: "remnd me to mail sharma assocites on 10 dec", types: ["reminder"], check: (i) => expect(i[0].date).toBe("2026-12-10") },
  { message: "studid cashflow statment for 2.5 hrs", types: ["progress_log"], check: (i) => expect(i[0].hours).toBe(2.5) },
  { message: "malwa advisers said no, not hiring intrns", types: ["outreach_update"], check: (i) => expect(i[0].outreach_status).toBe("dead") },
  { message: "wroking capital = currnt assets minus currnt liabilites, remeber this", types: ["note"] },
  // Hinglish
  { message: "kal balance sheet khatam karna hai", types: ["task"], check: (i) => expect(i[0].date).toBe("2026-12-04") },
  { message: "aaj 2 ghante cash flow padha", types: ["progress_log"], check: (i) => expect(i[0].hours).toBe(2) },
  { message: "Priya se mila aaj, wo ek chhote fund me kaam karti hai, number 98765xxxxx", types: ["contact"], check: (i) => expect(`${i[0].person} ${i[0].title}`).toMatch(/Priya/) },
  { message: "parso Indore Growth Partners ko follow up karna hai", types: ["reminder"], check: (i) => expect(i[0].date).toBe("2026-12-05") },
  { message: "XYZ Capital wale ne call book kar li monday ke liye", types: ["outreach_update"], check: (i) => expect(i[0].outreach_status).toBe("call booked") },
  { message: "mere chacha ke dost apni kirana wholesale ki dukaan 1-2 saal me bechna chahte hain", types: ["opportunity"] },
  // Several items in one message
  { message: "did 3 hrs on balance sheet. need to finish cash flow section tomorrow", types: ["progress_log", "task"] },
  { message: "met Amit Jain, CA at Sharma & Associates, amit@example.com. remind me to send him my memo on 8 dec", types: ["contact", "reminder"] },
  { message: "aaj 4 ghante modeling ki, XYZ Capital ne reply kiya, aur kal 3 naye naam outreach list me daalne hain", types: ["progress_log", "outreach_update", "task"] },
  // Unclear, and a mix of clear and unclear
  { message: "blue folder", types: ["inbox"], check: (i) => expect(i[0].question).toBeTruthy() },
  { message: "sent the email to Malwa Advisors today", types: ["outreach_update"], check: (i) => expect(i[0].outreach_status).toBe("sent") },
  { message: "EV/EBITDA multiples for FMCG are usually higher than for commodity businesses", types: ["note"] },
];

describe.skipIf(!hasKey)("classification with the real AI", () => {
  it.each(CASES)("$message", async ({ message, types, check }) => {
    const res = await runBot(getProvider(), message, ctx);
    expect(res.items.map((i) => i.type).sort()).toEqual([...types].sort());
    check?.(res.items);
  }, 60_000);

  it("answers a question from the user's data without filing anything", async () => {
    const res = await runBot(getProvider(), "which firms have I emailed but not heard back from?", ctx);
    expect(res.items).toEqual([]);
    expect(res.answer).toMatch(/XYZ/);
  }, 60_000);
});
