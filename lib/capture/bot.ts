// The conversation loop with the model. No database access here: the caller
// passes in a function that answers query_data, which keeps this testable.
import { AIError, type AIProvider, type ChatTurn, type Usage } from "@/lib/ai/types";
import { fileItemsSchema, queryDataSchema, systemPrompt, TOOLS, type Item } from "./items";

export type BotContext = {
  today: string;
  weekday: string;
  firms: string[];
  runQuery: (table: string, search: string | null) => Promise<unknown>;
};
export type BotResult = { items: Item[]; answer: string; usage: Usage };

const MAX_MODEL_CALLS = 4;

export async function runBot(provider: AIProvider, message: string, ctx: BotContext): Promise<BotResult> {
  const turns: ChatTurn[] = [{ role: "user", text: message }];
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  const items: Item[] = [];
  let answer = "";

  for (let call = 0; call < MAX_MODEL_CALLS; call++) {
    const res = await provider.generate({ system: systemPrompt(ctx), turns, tools: TOOLS });
    usage.inputTokens += res.usage.inputTokens;
    usage.outputTokens += res.usage.outputTokens;
    answer = res.text;
    if (res.toolCalls.length === 0) break;

    const results: { id: string; name: string; result: unknown }[] = [];
    let needsAnotherTurn = false;
    for (const tc of res.toolCalls) {
      if (tc.name === "file_items") {
        const parsed = fileItemsSchema.safeParse(tc.args);
        if (parsed.success) {
          items.push(...parsed.data.items);
          results.push({ id: tc.id, name: tc.name, result: { ok: true, filed: parsed.data.items.length } });
        } else {
          // Tell the model what was wrong and let it try again.
          results.push({ id: tc.id, name: tc.name, result: { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 500) } });
          needsAnotherTurn = true;
        }
      } else if (tc.name === "query_data") {
        const parsed = queryDataSchema.safeParse(tc.args);
        results.push({ id: tc.id, name: tc.name, result: parsed.success ? await ctx.runQuery(parsed.data.table, parsed.data.search) : { error: "Unknown table" } });
        needsAnotherTurn = true;
      } else {
        results.push({ id: tc.id, name: tc.name, result: { error: "Unknown tool" } });
        needsAnotherTurn = true;
      }
    }
    // After a plain filing there is nothing more to ask the model: stop and save tokens.
    if (!needsAnotherTurn) break;
    turns.push({ role: "assistant", payload: res.payload }, { role: "tool", results });
  }

  if (items.length === 0 && !answer) throw new AIError("The AI did not understand that message. Try rephrasing it.");
  return { items, answer, usage };
}
