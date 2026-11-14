// Google Gemini provider (the default). Uses the REST API directly.
import { toGeminiSchema } from "./schema";
import { AIError, RATE_LIMIT_MESSAGE, type AIProvider, type ChatTurn, type ToolCall } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const RETRY_WAITS_MS = [2000, 6000]; // two retries on rate limit or overload

type Part = { text?: string; thought?: boolean; functionCall?: { name: string; args?: unknown } };
type GeminiResponse = {
  candidates?: { content?: { role?: string; parts?: Part[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  error?: { message?: string; status?: string };
};

function toContents(turns: ChatTurn[]) {
  return turns.map((t) => {
    if (t.role === "user") return { role: "user", parts: [{ text: t.text }] };
    if (t.role === "assistant") return t.payload; // sent back exactly as Gemini produced it
    return { role: "user", parts: t.results.map((r) => ({ functionResponse: { name: r.name, response: { result: r.result } } })) };
  });
}

export function geminiProvider(apiKey: string, model: string): AIProvider {
  return {
    id: "gemini",
    model,
    async generate({ system, turns, tools }) {
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: toContents(turns),
        tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: toGeminiSchema(t.input) })) }],
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
      });

      for (let attempt = 0; ; attempt++) {
        let res: Response;
        try {
          res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body,
            cache: "no-store",
          });
        } catch {
          throw new AIError("Could not reach Google's AI service. Check your internet connection and try again.");
        }
        const data = (await res.json().catch(() => ({}))) as GeminiResponse;

        if (res.status === 429 || res.status === 503) {
          if (attempt < RETRY_WAITS_MS.length) {
            await new Promise((r) => setTimeout(r, RETRY_WAITS_MS[attempt]));
            continue;
          }
          throw new AIError(RATE_LIMIT_MESSAGE, "rate_limit");
        }
        if (res.status === 404) throw new AIError(`Gemini does not know the model "${model}". Check GEMINI_MODEL (see Settings for the models your key can use).`, "config");
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new AIError(`Gemini rejected the request: ${data.error?.message ?? res.status}. Check GEMINI_API_KEY and GEMINI_MODEL.`, "config");
        }
        if (!res.ok) throw new AIError(`Gemini error ${res.status}: ${data.error?.message ?? "unknown"}`);

        const content = data.candidates?.[0]?.content;
        const parts = content?.parts ?? [];
        const toolCalls: ToolCall[] = parts
          .filter((p) => p.functionCall)
          .map((p, i) => ({ id: `call_${i}`, name: p.functionCall!.name, args: p.functionCall!.args ?? {} }));
        const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join("").trim();
        if (!content || (toolCalls.length === 0 && !text)) {
          throw new AIError(`The AI returned nothing (${data.candidates?.[0]?.finishReason ?? "no reason given"}). Try rephrasing.`);
        }
        const u = data.usageMetadata ?? {};
        return {
          text,
          toolCalls,
          payload: { role: "model", parts },
          usage: { inputTokens: u.promptTokenCount ?? 0, outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0) },
        };
      }
    },
  };
}

// The Flash models this key can use, for the Settings page.
export async function listGeminiFlashModels(apiKey: string): Promise<string[]> {
  const res = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": apiKey }, cache: "no-store" });
  if (!res.ok) throw new Error(`Google answered ${res.status}`);
  const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && m.name.includes("flash"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((name) => !/image|tts|audio|live|embedding/.test(name))
    .sort()
    .reverse();
}
