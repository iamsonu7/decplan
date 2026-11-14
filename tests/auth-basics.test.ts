import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { isAllowedEmail } from "@/lib/allowed";
import { decrypt, encrypt } from "@/lib/crypto";
import { GOOGLE_SCOPE_STRING, missingScopes } from "@/lib/google/scopes";

describe("allowed email", () => {
  it("accepts only the allowed account, ignoring case and spaces", () => {
    expect(isAllowedEmail("Me@Gmail.com", " me@gmail.com ")).toBe(true);
    expect(isAllowedEmail("other@gmail.com", "me@gmail.com")).toBe(false);
  });
  it("rejects everyone when ALLOWED_EMAIL is missing", () => {
    expect(isAllowedEmail("me@gmail.com", undefined)).toBe(false);
    expect(isAllowedEmail(undefined, "me@gmail.com")).toBe(false);
  });
});

describe("token encryption", () => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  it("round-trips and never stores the plain value", () => {
    const stored = encrypt("refresh-token-123");
    expect(stored).not.toContain("refresh-token-123");
    expect(decrypt(stored)).toBe("refresh-token-123");
  });
  it("rejects tampered values", () => {
    const parts = encrypt("secret").split(".");
    parts[3] = Buffer.from("hacked").toString("base64url");
    expect(() => decrypt(parts.join("."))).toThrow();
  });
});

describe("scopes", () => {
  it("reports nothing missing when all are granted", () => {
    expect(missingScopes(GOOGLE_SCOPE_STRING)).toEqual([]);
  });
  it("reports a scope the user unticked", () => {
    const granted = GOOGLE_SCOPE_STRING.replace("https://www.googleapis.com/auth/gmail.compose", "");
    expect(missingScopes(granted)).toEqual(["Gmail (drafts and send)"]);
  });
});
