import { describe, it, expect } from "vitest";
import {
  closeContractSchema,
  invoiceListParamsSchema,
  updateInvoiceStatusSchema,
} from "@/lib/validations/invoices";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================================================
// closeContractSchema
// ============================================================================

const VALID_FULL = {
  contractId: VALID_UUID,
  actualReturnDate: "2026-02-10",
  returnMileage: 15000,
  damagesAmount: 500,
  notes: "Retour en bon état général",
};

const VALID_MINIMAL = {
  contractId: VALID_UUID,
  actualReturnDate: "2026-02-10",
  returnMileage: 12000,
};

describe("closeContractSchema", () => {
  it("accepts valid full input", () => {
    const result = closeContractSchema.safeParse(VALID_FULL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contractId).toBe(VALID_UUID);
      expect(result.data.actualReturnDate).toBeInstanceOf(Date);
      expect(result.data.returnMileage).toBe(15000);
      expect(result.data.damagesAmount).toBe(500);
      expect(result.data.notes).toBe("Retour en bon état général");
    }
  });

  it("accepts minimal input (contractId + actualReturnDate + returnMileage only)", () => {
    const result = closeContractSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contractId).toBe(VALID_UUID);
      expect(result.data.actualReturnDate).toBeInstanceOf(Date);
      expect(result.data.returnMileage).toBe(12000);
      expect(result.data.damagesAmount).toBe(0);
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("rejects invalid contractId (not UUID)", () => {
    const result = closeContractSchema.safeParse({
      ...VALID_MINIMAL,
      contractId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "contractId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects missing actualReturnDate", () => {
    const result = closeContractSchema.safeParse({
      contractId: VALID_UUID,
      returnMileage: 12000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing returnMileage", () => {
    const result = closeContractSchema.safeParse({
      contractId: VALID_UUID,
      actualReturnDate: "2026-02-10",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative returnMileage", () => {
    const result = closeContractSchema.safeParse({
      ...VALID_MINIMAL,
      returnMileage: -100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "returnMileage"
      );
      expect(err?.message).toContain("négatif");
    }
  });

  it("rejects negative damagesAmount", () => {
    const result = closeContractSchema.safeParse({
      ...VALID_MINIMAL,
      damagesAmount: -50,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "damagesAmount"
      );
      expect(err?.message).toContain("négatif");
    }
  });

  it("defaults damagesAmount to 0", () => {
    const result = closeContractSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.damagesAmount).toBe(0);
    }
  });
});

// ============================================================================
// invoiceListParamsSchema
// ============================================================================

describe("invoiceListParamsSchema", () => {
  it("defaults page=1, pageSize=20 when empty", () => {
    const result = invoiceListParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.status).toBeUndefined();
      expect(result.data.search).toBeUndefined();
      expect(result.data.period).toBeUndefined();
    }
  });

  it("coerces string page/pageSize to numbers", () => {
    const result = invoiceListParamsSchema.safeParse({
      page: "3",
      pageSize: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it("rejects invalid status enum value", () => {
    const result = invoiceListParamsSchema.safeParse({ status: "unknown" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "status");
      expect(err?.message).toBe("Le statut sélectionné est invalide");
    }
  });

  it("rejects page < 1", () => {
    const result = invoiceListParamsSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "page");
      expect(err?.message).toContain("au moins 1");
    }
  });

  it("rejects pageSize > 100", () => {
    const result = invoiceListParamsSchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "pageSize");
      expect(err?.message).toContain("100");
    }
  });

  it("validates all period enum values", () => {
    const periods = [
      "this_month",
      "last_month",
      "this_quarter",
      "this_year",
    ] as const;
    for (const period of periods) {
      const result = invoiceListParamsSchema.safeParse({ period });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBe(period);
      }
    }
  });

  it("rejects invalid period enum value", () => {
    const result = invoiceListParamsSchema.safeParse({ period: "last_week" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "period");
      expect(err?.message).toBe("La période sélectionnée est invalide");
    }
  });

  it("handles optional search (max 100 chars)", () => {
    const result = invoiceListParamsSchema.safeParse({ search: "FAC-2026" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("FAC-2026");
    }
  });

  it("rejects search > 100 chars", () => {
    const result = invoiceListParamsSchema.safeParse({
      search: "a".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "search");
      expect(err?.message).toContain("100 caractères");
    }
  });

  it("accepts all valid status values", () => {
    const statuses = [
      "pending",
      "invoiced",
      "verification",
      "paid",
      "conflict",
      "cancelled",
    ] as const;
    for (const status of statuses) {
      const result = invoiceListParamsSchema.safeParse({ status });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(status);
      }
    }
  });
});

// ============================================================================
// updateInvoiceStatusSchema
// ============================================================================

describe("updateInvoiceStatusSchema", () => {
  it("accepts valid input with newStatus 'invoiced'", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      invoiceId: VALID_UUID,
      newStatus: "invoiced",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceId).toBe(VALID_UUID);
      expect(result.data.newStatus).toBe("invoiced");
    }
  });

  it("accepts valid input with newStatus 'cancelled'", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      invoiceId: VALID_UUID,
      newStatus: "cancelled",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceId).toBe(VALID_UUID);
      expect(result.data.newStatus).toBe("cancelled");
    }
  });

  it("rejects non-uuid invoiceId", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      invoiceId: "not-a-uuid",
      newStatus: "invoiced",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "invoiceId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid newStatus 'paid'", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      invoiceId: VALID_UUID,
      newStatus: "paid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "newStatus");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid newStatus 'pending'", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      invoiceId: VALID_UUID,
      newStatus: "pending",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid newStatus 'foo'", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      invoiceId: VALID_UUID,
      newStatus: "foo",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = updateInvoiceStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
