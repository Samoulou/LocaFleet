import { describe, it, expect } from "vitest";
import { chatRequestSchema, chatMessageSchema } from "@/lib/validations/ai";

// ============================================================================
// chatMessageSchema
// ============================================================================

describe("chatMessageSchema", () => {
  it("accepts valid user message", () => {
    const result = chatMessageSchema.safeParse({
      role: "user",
      content: "Quelles voitures sont disponibles ce weekend ?",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid assistant message", () => {
    const result = chatMessageSchema.safeParse({
      role: "assistant",
      content: "Voici les vehicules disponibles...",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = chatMessageSchema.safeParse({
      role: "user",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content > 4000 chars", () => {
    const result = chatMessageSchema.safeParse({
      role: "user",
      content: "a".repeat(4001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = chatMessageSchema.safeParse({
      role: "system",
      content: "hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing role", () => {
    const result = chatMessageSchema.safeParse({
      content: "hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing content", () => {
    const result = chatMessageSchema.safeParse({
      role: "user",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// chatRequestSchema
// ============================================================================

describe("chatRequestSchema", () => {
  it("accepts valid request with single message", () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: "Bonjour" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid request with multiple messages", () => {
    const result = chatRequestSchema.safeParse({
      messages: [
        { role: "user", content: "Bonjour" },
        { role: "assistant", content: "Bonjour !" },
        { role: "user", content: "Question" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty messages array", () => {
    const result = chatRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });

  it("rejects messages array > 20 items", () => {
    const result = chatRequestSchema.safeParse({
      messages: Array.from({ length: 21 }, () => ({
        role: "user" as const,
        content: "test",
      })),
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 20 messages", () => {
    const result = chatRequestSchema.safeParse({
      messages: Array.from({ length: 20 }, () => ({
        role: "user" as const,
        content: "test",
      })),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing messages", () => {
    const result = chatRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid message inside array", () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: "" }],
    });
    expect(result.success).toBe(false);
  });
});
