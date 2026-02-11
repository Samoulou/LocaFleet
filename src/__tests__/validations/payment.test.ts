import { describe, it, expect } from "vitest";
import { processPaymentSchema } from "@/lib/validations/payment";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_FULL = {
  invoiceId: VALID_UUID,
  amount: 1250.5,
  method: "invoice" as const,
  paidAt: "2026-02-10",
  reference: "VIR-2026-001",
  notes: "Paiement reçu par virement",
};

const VALID_MINIMAL = {
  invoiceId: VALID_UUID,
  amount: 100,
  method: "cash_departure" as const,
  paidAt: "2026-02-10",
};

describe("processPaymentSchema", () => {
  it("accepts valid full input", () => {
    const result = processPaymentSchema.safeParse(VALID_FULL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceId).toBe(VALID_UUID);
      expect(result.data.amount).toBe(1250.5);
      expect(result.data.method).toBe("invoice");
      expect(result.data.paidAt).toBeInstanceOf(Date);
      expect(result.data.reference).toBe("VIR-2026-001");
      expect(result.data.notes).toBe("Paiement reçu par virement");
    }
  });

  it("accepts minimal input (only required fields)", () => {
    const result = processPaymentSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceId).toBe(VALID_UUID);
      expect(result.data.amount).toBe(100);
      expect(result.data.method).toBe("cash_departure");
      expect(result.data.paidAt).toBeInstanceOf(Date);
      expect(result.data.reference).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("rejects invalid invoiceId (not a UUID)", () => {
    const result = processPaymentSchema.safeParse({
      ...VALID_MINIMAL,
      invoiceId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "invoiceId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects zero amount", () => {
    const result = processPaymentSchema.safeParse({
      ...VALID_MINIMAL,
      amount: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "amount");
      expect(err?.message).toContain("supérieur à zéro");
    }
  });

  it("rejects negative amount", () => {
    const result = processPaymentSchema.safeParse({
      ...VALID_MINIMAL,
      amount: -50,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "amount");
      expect(err?.message).toContain("supérieur à zéro");
    }
  });

  it("rejects invalid method", () => {
    const result = processPaymentSchema.safeParse({
      ...VALID_MINIMAL,
      method: "bitcoin",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "method");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid paidAt", () => {
    const result = processPaymentSchema.safeParse({
      ...VALID_MINIMAL,
      paidAt: "not-a-date",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "paidAt");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects reference > 255 chars", () => {
    const result = processPaymentSchema.safeParse({
      ...VALID_MINIMAL,
      reference: "x".repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "reference");
      expect(err?.message).toContain("255 caractères");
    }
  });

  it("rejects notes > 2000 chars", () => {
    const result = processPaymentSchema.safeParse({
      ...VALID_MINIMAL,
      notes: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "notes");
      expect(err?.message).toContain("2000 caractères");
    }
  });

  it("transforms empty reference to undefined", () => {
    const result = processPaymentSchema.safeParse({
      ...VALID_MINIMAL,
      reference: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reference).toBeUndefined();
    }
  });

  it("transforms empty notes to undefined", () => {
    const result = processPaymentSchema.safeParse({
      ...VALID_MINIMAL,
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeUndefined();
    }
  });
});
