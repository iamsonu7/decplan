// Picks the AI provider from environment variables and estimates cost.
import { anthropicProvider } from "./anthropic";
import { fakeProvider } from "./fake";
import { geminiProvider } from "./gemini";
import { AIError, type AIProvider, type Usage } from "./types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-5-5";

export function providerName(): "gemini" | "anthropic" | "fake" {
  const name = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  return name === "anthropic" || name === "fake" ? name : "gemini";
}

export function getProvider(): AIProvider {
  const name = providerName();
  if (name === "fake") return fakeProvider;
  if (name === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new AIError("ANTHROPIC_API_KEY is not set. See SETUP.md, Part I.", "config");
    return anthropicProvider(key, process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL);
  }
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!key) throw new AIError("GEMINI_API_KEY is not set. See SETUP.md, Part I.", "config");
  if (!model) throw new AIError("GEMINI_MODEL is not set. Settings lists the models your key can use. See SETUP.md, Part I.", "config");
  return geminiProvider(key, model);
}

// US dollars per one million tokens. Gemini is 0 because the app is meant to run
// on Google's free tier; if you turn on billing, Google charges its own rates.
const PRICES: Record<string, { input: number; output: number }> = {
  anthropic: { input: 0.1, output: 0.5 }, // Claude Haiku 5.5, prompts up to 100K tokens
  gemini: { input: 0, output: 0 },
  fake: { input: 0, output: 0 },
};

export function estimateCostUsd(provider: string, usage: Usage): number {
  const p = PRICES[provider] ?? PRICES.gemini;
  return (usage.inputTokens * p.input + usage.outputTokens * p.output) / 1_000_000;
}
