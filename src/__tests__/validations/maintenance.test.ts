import { describe, it, expect } from "vitest";
import { createMaintenanceSchema } from "@/lib/validations/maintenance";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_FULL = {
  vehicleId: VALID_UUID,
  type: "regular_service" as const,
  description: "Vidange + filtres",
  startDate: "2025-06-01",
  estimatedCost: 350,
  mechanicName: "Jean Dupont",
  mechanicEmail: "jean@garage.ch",
  urgency: "high" as const,
  notes: "Vérifier aussi les freins",
};

const VALID_MINIMAL = {
  vehicleId: VALID_UUID,
  type: "repair" as const,
  description: "Remplacement courroie",
  startDate: "2025-06-01",
};

describe("createMaintenanceSchema", () => {
  it("accepts valid full input", () => {
    const result = createMaintenanceSchema.safeParse(VALID_FULL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleId).toBe(VALID_UUID);
      expect(result.data.type).toBe("regular_service");
      expect(result.data.description).toBe("Vidange + filtres");
      expect(result.data.startDate).toBeInstanceOf(Date);
      expect(result.data.estimatedCost).toBe(350);
      expect(result.data.mechanicName).toBe("Jean Dupont");
      expect(result.data.mechanicEmail).toBe("jean@garage.ch");
      expect(result.data.urgency).toBe("high");
      expect(result.data.notes).toBe("Vérifier aussi les freins");
    }
  });

  it("accepts minimal input (vehicleId, type, description, startDate only)", () => {
    const result = createMaintenanceSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleId).toBe(VALID_UUID);
      expect(result.data.type).toBe("repair");
      expect(result.data.description).toBe("Remplacement courroie");
      expect(result.data.urgency).toBe("medium");
      expect(result.data.estimatedCost).toBeUndefined();
      expect(result.data.mechanicName).toBeUndefined();
      expect(result.data.mechanicEmail).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("rejects invalid vehicleId (not a UUID)", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      vehicleId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "vehicleId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid type value", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      type: "oil_change",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "type");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects empty description", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      description: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "description");
      expect(err?.message).toContain("requise");
    }
  });

  it("rejects description > 2000 chars", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      description: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "description");
      expect(err?.message).toContain("2000 caractères");
    }
  });

  it("rejects invalid startDate", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      startDate: "not-a-date",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "startDate");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects negative estimatedCost", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      estimatedCost: -50,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "estimatedCost"
      );
      expect(err?.message).toContain("négatif");
    }
  });

  it("transforms empty estimatedCost to undefined", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      estimatedCost: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimatedCost).toBeUndefined();
    }
  });

  it("rejects invalid mechanicEmail", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      mechanicEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "mechanicEmail"
      );
      expect(err?.message).toContain("invalide");
    }
  });

  it("transforms empty mechanicEmail to undefined", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      mechanicEmail: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mechanicEmail).toBeUndefined();
    }
  });

  it("transforms empty mechanicName to undefined", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      mechanicName: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mechanicName).toBeUndefined();
    }
  });

  it("transforms empty notes to undefined", () => {
    const result = createMaintenanceSchema.safeParse({
      ...VALID_MINIMAL,
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("defaults urgency to medium", () => {
    const result = createMaintenanceSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.urgency).toBe("medium");
    }
  });
});
