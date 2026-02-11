import { describe, it, expect } from "vitest";
import { closeMaintenanceSchema } from "@/lib/validations/close-maintenance";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_FULL = {
  maintenanceId: VALID_UUID,
  endDate: "2025-06-15",
  finalCost: 450,
  notes: "Travaux terminés, tout est OK",
};

const VALID_MINIMAL = {
  maintenanceId: VALID_UUID,
  endDate: "2025-06-15",
};

describe("closeMaintenanceSchema", () => {
  it("accepts valid full input", () => {
    const result = closeMaintenanceSchema.safeParse(VALID_FULL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maintenanceId).toBe(VALID_UUID);
      expect(result.data.endDate).toBeInstanceOf(Date);
      expect(result.data.finalCost).toBe(450);
      expect(result.data.notes).toBe("Travaux terminés, tout est OK");
    }
  });

  it("accepts minimal input (maintenanceId + endDate only)", () => {
    const result = closeMaintenanceSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maintenanceId).toBe(VALID_UUID);
      expect(result.data.endDate).toBeInstanceOf(Date);
      expect(result.data.finalCost).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("rejects invalid maintenanceId (not UUID)", () => {
    const result = closeMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      maintenanceId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "maintenanceId"
      );
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid endDate", () => {
    const result = closeMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      endDate: "not-a-date",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "endDate");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects negative finalCost", () => {
    const result = closeMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      finalCost: -50,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "finalCost");
      expect(err?.message).toContain("négatif");
    }
  });

  it("transforms empty finalCost to undefined", () => {
    const result = closeMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      finalCost: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.finalCost).toBeUndefined();
    }
  });

  it("transforms empty notes to undefined", () => {
    const result = closeMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("rejects notes > 2000 chars", () => {
    const result = closeMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      notes: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "notes");
      expect(err?.message).toContain("2000 caractères");
    }
  });
});
