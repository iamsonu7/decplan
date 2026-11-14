// One small interface that every AI provider implements, so the provider can be
// swapped with the AI_PROVIDER environment variable.

// A provider-neutral description of a tool's input.
export type FieldSpec =
  | { type: "string" | "number"; description: string; enum?: readonly string[]; optional?: boolean }
  | { type: "array"; description: string; items: ObjectSpec };
export type ObjectSpec = { fields: Record<string, FieldSpec> };
export type ToolSpec = { name: string; description: string; input: ObjectSpec };

export type ToolCall = { id: string; name: string; args: unknown };

// The conversation sent to the model.
export type ChatTurn =
  | { role: "user"; text: string }
  | { role: "assistant"; payload: unknown } // the provider's own reply, sent back unchanged
  | { role: "tool"; results: { id: string; name: string; result: unknown }[] };

export type Usage = { inputTokens: number; outputTokens: number };
export type AIResult = { text: string; toolCalls: ToolCall[]; payload: unknown; usage: Usage };

export interface AIProvider {
  id: string; // "gemini" | "anthropic" | "fake"
  model: string;
  generate(input: { system: string; turns: ChatTurn[]; tools: ToolSpec[] }): Promise<AIResult>;
}

// An error with a message that is safe and useful to show in the app.
export class AIError extends Error {
  constructor(
    message: string,
    public kind: "rate_limit" | "config" | "other" = "other",
  ) {
    super(message);
  }
}

export const RATE_LIMIT_MESSAGE = "The AI is busy right now (rate limit). Wait a minute and try again. Nothing was filed.";
