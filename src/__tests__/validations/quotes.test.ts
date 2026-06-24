import { describe, it, expect } from "vitest";
import {
  createQuoteSchema,
  updateQuoteSchema,
  updateQuoteStatusSchema,
  listQuotesFiltersSchema,
} from "@/lib/validations/quotes";

const CLIENT_ID = "550e8400-e29b-41d4-a716-446655440001";
const FONCTION_ID = "550e8400-e29b-41d4-a716-446655440002";
const QUOTE_ID = "550e8400-e29b-41d4-a716-446655440003";

const VALID_INPUT = {
  clientId: CLIENT_ID,
  fonctionId: FONCTION_ID,
  title: "Déménagement Dupont",
  startDate: "2026-07-01T08:00:00",
  endDate: "2026-07-01T17:00:00",
  lineItems: [
    { description: "Camion + 3 déménageurs", quantity: 8, unitPrice: "120" },
    { description: "Cartons", quantity: 30, unitPrice: "2.50" },
  ],
  validUntil: "2026-06-30",
  notes: "Accès difficile au 3e étage",
};

describe("createQuoteSchema", () => {
  it("accepts a full valid quote and coerces numbers", () => {
    const result = createQuoteSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lineItems[0].unitPrice).toBe(120);
      expect(result.data.lineItems[1].quantity).toBe(30);
      expect(result.data.startDate).toBeInstanceOf(Date);
    }
  });

  it("accepts a quote without dates (period optional)", () => {
    const result = createQuoteSchema.safeParse({
      ...VALID_INPUT,
      startDate: "",
      endDate: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBeUndefined();
      expect(result.data.endDate).toBeUndefined();
    }
  });

  it("rejects a single-sided period", () => {
    const result = createQuoteSchema.safeParse({
      ...VALID_INPUT,
      endDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects endDate before startDate", () => {
    const result = createQuoteSchema.safeParse({
      ...VALID_INPUT,
      startDate: "2026-07-02T08:00:00",
      endDate: "2026-07-01T08:00:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "endDate");
      expect(error?.message).toBe(
        "La date de fin doit être après la date de début"
      );
    }
  });

  it("rejects an empty lineItems array with French message", () => {
    const result = createQuoteSchema.safeParse({
      ...VALID_INPUT,
      lineItems: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Au moins une ligne est requise"
      );
    }
  });

  it("rejects a line with zero quantity", () => {
    const result = createQuoteSchema.safeParse({
      ...VALID_INPUT,
      lineItems: [{ description: "Camion", quantity: 0, unitPrice: "120" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a line with negative unit price", () => {
    const result = createQuoteSchema.safeParse({
      ...VALID_INPUT,
      lineItems: [{ description: "Camion", quantity: 1, unitPrice: "-5" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a line without description", () => {
    const result = createQuoteSchema.safeParse({
      ...VALID_INPUT,
      lineItems: [{ description: "", quantity: 1, unitPrice: "10" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid client id", () => {
    const result = createQuoteSchema.safeParse({
      ...VALID_INPUT,
      clientId: "nope",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateQuoteSchema", () => {
  it("requires a valid quote id", () => {
    expect(
      updateQuoteSchema.safeParse({ ...VALID_INPUT, id: QUOTE_ID }).success
    ).toBe(true);
    expect(
      updateQuoteSchema.safeParse({ ...VALID_INPUT, id: "nope" }).success
    ).toBe(false);
    expect(updateQuoteSchema.safeParse(VALID_INPUT).success).toBe(false);
  });
});

describe("updateQuoteStatusSchema", () => {
  it("accepts all valid statuses", () => {
    for (const status of ["draft", "sent", "accepted", "declined", "expired"]) {
      expect(
        updateQuoteStatusSchema.safeParse({ id: QUOTE_ID, status }).success
      ).toBe(true);
    }
  });

  it("rejects unknown status with French message", () => {
    const result = updateQuoteStatusSchema.safeParse({
      id: QUOTE_ID,
      status: "archived",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Le statut sélectionné est invalide"
      );
    }
  });
});

describe("listQuotesFiltersSchema", () => {
  it("applies defaults", () => {
    const result = listQuotesFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("rejects unknown status", () => {
    expect(listQuotesFiltersSchema.safeParse({ status: "open" }).success).toBe(
      false
    );
  });
});
