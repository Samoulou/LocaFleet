import { describe, it, expect } from "vitest";
import { globalSearchSchema } from "@/lib/validations/search";

// ============================================================================
// globalSearchSchema
// ============================================================================

describe("globalSearchSchema", () => {
  it("accepts valid query (2+ chars)", () => {
    const result = globalSearchSchema.safeParse({ query: "VD" });
    expect(result.success).toBe(true);
  });

  it("accepts long query within limit", () => {
    const result = globalSearchSchema.safeParse({ query: "Toyota RAV4" });
    expect(result.success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = globalSearchSchema.safeParse({ query: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "La recherche doit contenir au moins 2 caractères"
      );
    }
  });

  it("rejects single character", () => {
    const result = globalSearchSchema.safeParse({ query: "V" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "La recherche doit contenir au moins 2 caractères"
      );
    }
  });

  it("rejects string > 100 chars", () => {
    const result = globalSearchSchema.safeParse({ query: "a".repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "La recherche ne peut pas dépasser 100 caractères"
      );
    }
  });

  it("accepts exactly 100 chars", () => {
    const result = globalSearchSchema.safeParse({ query: "a".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("rejects missing query", () => {
    const result = globalSearchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string query", () => {
    const result = globalSearchSchema.safeParse({ query: 123 });
    expect(result.success).toBe(false);
  });

  it("has French error messages", () => {
    const result = globalSearchSchema.safeParse({ query: "V" });
    expect(result.success).toBe(false);
    if (!result.success) {
      for (const issue of result.error.issues) {
        expect(issue.message).toMatch(/recherche|caractères/i);
      }
    }
  });
});
