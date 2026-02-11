import { describe, it, expect } from "vitest";
import { approveContractSchema } from "@/lib/validations/approve-contract";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("approveContractSchema", () => {
  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("accepts a valid UUID", () => {
    const result = approveContractSchema.safeParse({ contractId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contractId).toBe(VALID_UUID);
    }
  });

  // --------------------------------------------------------------------------
  // Failure cases
  // --------------------------------------------------------------------------

  it("rejects missing contractId", () => {
    const result = approveContractSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID", () => {
    const result = approveContractSchema.safeParse({
      contractId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "contractId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects empty string", () => {
    const result = approveContractSchema.safeParse({ contractId: "" });
    expect(result.success).toBe(false);
  });

  it("strips extra fields", () => {
    const result = approveContractSchema.safeParse({
      contractId: VALID_UUID,
      extraField: "should be removed",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ contractId: VALID_UUID });
      expect("extraField" in result.data).toBe(false);
    }
  });
});
