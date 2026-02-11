import { describe, it, expect } from "vitest";
import { createContractSchema } from "@/lib/validations/contracts";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "660e8400-e29b-41d4-a716-446655440000";
const OPTION_UUID = "770e8400-e29b-41d4-a716-446655440001";

const VALID_FULL = {
  vehicleId: VALID_UUID,
  clientId: VALID_UUID_2,
  startDate: "2026-03-01",
  endDate: "2026-03-05",
  paymentMethod: "cash" as const,
  selectedOptionIds: [OPTION_UUID],
  includedKmPerDay: 200,
  excessKmRate: 0.5,
  depositAmount: 1000,
  pickupLocation: "Agence Lausanne",
  returnLocation: "Agence Genève",
  notes: "Client VIP",
};

const VALID_MINIMAL = {
  vehicleId: VALID_UUID,
  clientId: VALID_UUID_2,
  startDate: "2026-03-01",
  endDate: "2026-03-05",
  paymentMethod: "card" as const,
};

describe("createContractSchema", () => {
  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("accepts valid full input", () => {
    const result = createContractSchema.safeParse(VALID_FULL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleId).toBe(VALID_UUID);
      expect(result.data.clientId).toBe(VALID_UUID_2);
      expect(result.data.startDate).toBeInstanceOf(Date);
      expect(result.data.endDate).toBeInstanceOf(Date);
      expect(result.data.paymentMethod).toBe("cash");
      expect(result.data.selectedOptionIds).toEqual([OPTION_UUID]);
      expect(result.data.includedKmPerDay).toBe(200);
      expect(result.data.excessKmRate).toBe(0.5);
      expect(result.data.depositAmount).toBe(1000);
      expect(result.data.pickupLocation).toBe("Agence Lausanne");
      expect(result.data.returnLocation).toBe("Agence Genève");
      expect(result.data.notes).toBe("Client VIP");
    }
  });

  it("accepts minimal input (required fields only)", () => {
    const result = createContractSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleId).toBe(VALID_UUID);
      expect(result.data.clientId).toBe(VALID_UUID_2);
      expect(result.data.paymentMethod).toBe("card");
      expect(result.data.selectedOptionIds).toEqual([]);
      expect(result.data.includedKmPerDay).toBeUndefined();
      expect(result.data.excessKmRate).toBeUndefined();
      expect(result.data.depositAmount).toBeUndefined();
      expect(result.data.pickupLocation).toBeUndefined();
      expect(result.data.returnLocation).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("accepts bank_transfer as payment method", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      paymentMethod: "bank_transfer",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentMethod).toBe("bank_transfer");
    }
  });

  // --------------------------------------------------------------------------
  // Invalid UUID cases
  // --------------------------------------------------------------------------

  it("rejects invalid vehicleId (not a UUID)", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      vehicleId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "vehicleId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid clientId (not a UUID)", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      clientId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "clientId");
      expect(err?.message).toContain("invalide");
    }
  });

  // --------------------------------------------------------------------------
  // Invalid date cases
  // --------------------------------------------------------------------------

  it("rejects invalid startDate", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      startDate: "not-a-date",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "startDate");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid endDate", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      endDate: "not-a-date",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "endDate");
      expect(err?.message).toContain("invalide");
    }
  });

  // --------------------------------------------------------------------------
  // Date refinement (endDate must be > startDate)
  // --------------------------------------------------------------------------

  it("rejects endDate before startDate", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      startDate: "2026-03-05",
      endDate: "2026-03-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes("endDate"));
      expect(err?.message).toContain("postérieure");
    }
  });

  it("rejects endDate equal to startDate", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      startDate: "2026-03-05",
      endDate: "2026-03-05",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes("endDate"));
      expect(err?.message).toContain("postérieure");
    }
  });

  // --------------------------------------------------------------------------
  // Invalid payment method
  // --------------------------------------------------------------------------

  it("rejects invalid payment method", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      paymentMethod: "bitcoin",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "paymentMethod"
      );
      expect(err?.message).toContain("invalide");
    }
  });

  // --------------------------------------------------------------------------
  // Optional field transforms
  // --------------------------------------------------------------------------

  it("transforms empty includedKmPerDay to undefined", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      includedKmPerDay: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includedKmPerDay).toBeUndefined();
    }
  });

  it("transforms empty excessKmRate to undefined", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      excessKmRate: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.excessKmRate).toBeUndefined();
    }
  });

  it("transforms empty depositAmount to undefined", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      depositAmount: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.depositAmount).toBeUndefined();
    }
  });

  it("transforms empty pickupLocation to undefined", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      pickupLocation: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pickupLocation).toBeUndefined();
    }
  });

  it("transforms empty notes to undefined", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeUndefined();
    }
  });

  // --------------------------------------------------------------------------
  // Negative numbers rejected
  // --------------------------------------------------------------------------

  it("rejects negative includedKmPerDay", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      includedKmPerDay: -10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "includedKmPerDay"
      );
      expect(err?.message).toContain("négatif");
    }
  });

  it("rejects negative excessKmRate", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      excessKmRate: -0.5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "excessKmRate");
      expect(err?.message).toContain("négatif");
    }
  });

  it("rejects negative depositAmount", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      depositAmount: -100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "depositAmount"
      );
      expect(err?.message).toContain("négatif");
    }
  });

  // --------------------------------------------------------------------------
  // Max length
  // --------------------------------------------------------------------------

  it("rejects notes exceeding 2000 characters", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      notes: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "notes");
      expect(err?.message).toContain("2000 caractères");
    }
  });

  it("rejects pickupLocation exceeding 255 characters", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      pickupLocation: "x".repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "pickupLocation"
      );
      expect(err?.message).toContain("255 caractères");
    }
  });

  // --------------------------------------------------------------------------
  // Default values
  // --------------------------------------------------------------------------

  it("defaults selectedOptionIds to empty array", () => {
    const result = createContractSchema.safeParse({
      vehicleId: VALID_UUID,
      clientId: VALID_UUID_2,
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      paymentMethod: "cash",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.selectedOptionIds).toEqual([]);
    }
  });

  // --------------------------------------------------------------------------
  // Datetime with time components
  // --------------------------------------------------------------------------

  it("accepts ISO datetime strings with times", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      startDate: "2026-04-01T09:00:00",
      endDate: "2026-04-03T17:00:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBeInstanceOf(Date);
      expect(result.data.endDate).toBeInstanceOf(Date);
      expect(result.data.startDate.getHours()).toBe(9);
      expect(result.data.endDate.getHours()).toBe(17);
    }
  });

  it("accepts Date objects with time components", () => {
    const start = new Date("2026-04-01T08:30:00");
    const end = new Date("2026-04-02T14:00:00");
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      startDate: start,
      endDate: end,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate.getHours()).toBe(8);
      expect(result.data.endDate.getHours()).toBe(14);
    }
  });

  it("rejects endDate with earlier time on same day", () => {
    const result = createContractSchema.safeParse({
      ...VALID_MINIMAL,
      startDate: "2026-04-01T14:00:00",
      endDate: "2026-04-01T10:00:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes("endDate"));
      expect(err?.message).toContain("postérieure");
    }
  });
});
