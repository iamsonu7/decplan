// Anthropic provider, used when AI_PROVIDER=anthropic. Uses the official SDK.
import Anthropic from "@anthropic-ai/sdk";
import { toStrictJsonSchema } from "./schema";
import { AIError, RATE_LIMIT_MESSAGE, type AIProvider, type ChatTurn, type ToolCall } from "./types";

function toMessages(turns: ChatTurn[]): Anthropic.MessageParam[] {
  return turns.map((t): Anthropic.MessageParam => {
    if (t.role === "user") return { role: "user", content: t.text };
    // The full reply (including thinking blocks) goes back unchanged.
    if (t.role === "assistant") return { role: "assistant", content: t.payload as Anthropic.ContentBlockParam[] };
    return {
      role: "user",
      content: t.results.map((r): Anthropic.ToolResultBlockParam => ({ type: "tool_result", tool_use_id: r.id, content: JSON.stringify(r.result) })),
    };
  });
}

export function anthropicProvider(apiKey: string, model: string): AIProvider {
  const client = new Anthropic({ apiKey, maxRetries: 2 }); // the SDK retries rate limits itself
  return {
    id: "anthropic",
    model,
    async generate({ system, turns, tools }) {
      let response: Anthropic.Message;
      try {
        response = await client.messages.create({
          model,
          max_tokens: 4000,
          output_config: { effort: "low" }, // filing notes is simple work: keep it quick and cheap
          system,
          tools: tools.map((t): Anthropic.Tool => ({ name: t.name, description: t.description, strict: true, input_schema: toStrictJsonSchema(t.input) as Anthropic.Tool.InputSchema })),
          messages: toMessages(turns),
        });
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError) throw new AIError(RATE_LIMIT_MESSAGE, "rate_limit");
        if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
          throw new AIError("Anthropic rejected the API key. Check ANTHROPIC_API_KEY.", "config");
        }
        if (error instanceof Anthropic.NotFoundError) throw new AIError(`Anthropic does not know the model "${model}". Check ANTHROPIC_MODEL.`, "config");
        if (error instanceof Anthropic.APIConnectionError) throw new AIError("Could not reach Anthropic. Check your internet connection and try again.");
        if (error instanceof Anthropic.APIError) throw new AIError(`Anthropic error ${error.status ?? ""}: ${error.message}`);
        throw error;
      }

      if (response.stop_reason === "refusal") throw new AIError("The AI declined to handle that message.");
      if (response.stop_reason === "max_tokens") throw new AIError("The AI's reply was cut off. Try a shorter message.");

      const toolCalls: ToolCall[] = [];
      let text = "";
      for (const block of response.content) {
        if (block.type === "tool_use") toolCalls.push({ id: block.id, name: block.name, args: block.input });
        else if (block.type === "text") text += block.text;
      }
      return {
        text: text.trim(),
        toolCalls,
        payload: response.content,
        usage: {
          inputTokens: response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0),
          outputTokens: response.usage.output_tokens,
        },
      };
    },
  };
}
