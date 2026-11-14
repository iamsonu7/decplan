// Turns the neutral tool description into the JSON schema each provider expects.
import type { FieldSpec, ObjectSpec } from "./types";

type Json = Record<string, unknown>;

// Strict JSON Schema (Anthropic): every field is required, optional ones may be null,
// and no extra fields are allowed.
export function toStrictJsonSchema(spec: ObjectSpec): Json {
  const properties: Json = {};
  for (const [name, f] of Object.entries(spec.fields)) properties[name] = strictField(f);
  return { type: "object", properties, required: Object.keys(spec.fields), additionalProperties: false };
}

function strictField(f: FieldSpec): Json {
  if (f.type === "array") return { type: "array", description: f.description, items: toStrictJsonSchema(f.items) };
  const out: Json = { type: f.optional ? [f.type, "null"] : f.type, description: f.description };
  if (f.enum) out.enum = f.optional ? [...f.enum, null] : [...f.enum];
  return out;
}

// Gemini function declarations use an OpenAPI-style schema.
export function toGeminiSchema(spec: ObjectSpec): Json {
  const properties: Json = {};
  const required: string[] = [];
  for (const [name, f] of Object.entries(spec.fields)) {
    if (f.type === "array") {
      properties[name] = { type: "ARRAY", description: f.description, items: toGeminiSchema(f.items) };
      required.push(name);
      continue;
    }
    const out: Json = { type: f.type === "number" ? "NUMBER" : "STRING", description: f.description };
    if (f.enum) out.enum = [...f.enum];
    if (f.optional) out.nullable = true;
    else required.push(name);
    properties[name] = out;
  }
  return { type: "OBJECT", properties, required };
}
