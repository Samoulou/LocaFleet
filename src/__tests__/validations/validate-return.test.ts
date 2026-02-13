import { describe, it, expect } from "vitest";
import { validateReturnSchema } from "@/lib/validations/validate-return";

describe("validateReturnSchema", () => {
  const VALID_UUID = "d0000000-0000-4000-8000-000000000001";

  it("accepts valid input with contractId only", () => {
    const result = validateReturnSchema.safeParse({ contractId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contractId).toBe(VALID_UUID);
      expect(result.data.damagesAmount).toBe(0);
    }
  });

  it("accepts valid input with damagesAmount", () => {
    const result = validateReturnSchema.safeParse({
      contractId: VALID_UUID,
      damagesAmount: 150.5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.damagesAmount).toBe(150.5);
    }
  });

  it("coerces string damagesAmount to number", () => {
    const result = validateReturnSchema.safeParse({
      contractId: VALID_UUID,
      damagesAmount: "250",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.damagesAmount).toBe(250);
    }
  });

  it("defaults damagesAmount to 0 when omitted", () => {
    const result = validateReturnSchema.safeParse({ contractId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.damagesAmount).toBe(0);
    }
  });

  it("rejects missing contractId", () => {
    const result = validateReturnSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for contractId", () => {
    const result = validateReturnSchema.safeParse({ contractId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("invalide");
    }
  });

  it("rejects negative damagesAmount", () => {
    const result = validateReturnSchema.safeParse({
      contractId: VALID_UUID,
      damagesAmount: -10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("négatif");
    }
  });

  it("accepts damagesAmount of 0", () => {
    const result = validateReturnSchema.safeParse({
      contractId: VALID_UUID,
      damagesAmount: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.damagesAmount).toBe(0);
    }
  });

  it("rejects damagesAmount exceeding 100000", () => {
    const result = validateReturnSchema.safeParse({
      contractId: VALID_UUID,
      damagesAmount: 100001,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("100'000");
    }
  });

  it("accepts damagesAmount at the 100000 limit", () => {
    const result = validateReturnSchema.safeParse({
      contractId: VALID_UUID,
      damagesAmount: 100000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.damagesAmount).toBe(100000);
    }
  });
});
