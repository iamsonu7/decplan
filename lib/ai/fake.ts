// A keyword-based stand-in used only when AI_PROVIDER=fake, for testing the app
// without an API key. It is not smart: use Gemini or Anthropic for real use.
import type { AIProvider } from "./types";

const RULES: [RegExp, string][] = [
  [/remind|follow ?up|yaad/i, "reminder"],
  [/replied|reply|responded|jawab/i, "outreach_update"],
  [/\bmet\b|mila|number|phone/i, "contact"],
  [/hours?|ghante|hrs?\b/i, "progress_log"],
  [/wants to sell|opportunit|bechna/i, "opportunity"],
  [/need to|todo|finish|karna hai|tomorrow|kal/i, "task"],
];

export const fakeProvider: AIProvider = {
  id: "fake",
  model: "fake-keywords",
  async generate({ turns }) {
    const last = [...turns].reverse().find((t) => t.role === "user");
    const text = last && last.role === "user" ? last.text : "";
    const empty = { details: null, date: null, time: null, person: null, firm: null, phone: null, email: null, hours: null, outreach_status: null, contact_kind: null, tags: null, question: null };
    const items = text
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const type = RULES.find(([re]) => re.test(line))?.[1] ?? (line.length < 12 ? "inbox" : "note");
        const hours = type === "progress_log" ? Number(line.match(/(\d+(\.\d+)?)/)?.[1] ?? 1) : null;
        const firm = type === "outreach_update" ? line.split(/\s+(replied|reply|responded)/i)[0] : null;
        return { ...empty, type, title: line.slice(0, 80), details: line, hours, firm, outreach_status: type === "outreach_update" ? "replied" : null, question: type === "inbox" ? "What is this about?" : null };
      });
    return { text: "", toolCalls: [{ id: "fake_1", name: "file_items", args: { items } }], payload: null, usage: { inputTokens: text.length, outputTokens: 20 } };
  },
};
