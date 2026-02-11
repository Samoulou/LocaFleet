import { describe, it, expect } from "vitest";
import {
  changeVehicleStatusSchema,
  ALLOWED_TRANSITIONS,
} from "@/lib/validations/vehicle-status";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_FULL = {
  vehicleId: VALID_UUID,
  newStatus: "maintenance" as const,
  reason: "Vidange planifiée",
  createMaintenanceRecord: true,
  maintenanceDescription: "Vidange + filtres",
  maintenanceType: "regular_service" as const,
};

const VALID_MINIMAL = {
  vehicleId: VALID_UUID,
  newStatus: "maintenance" as const,
};

describe("changeVehicleStatusSchema", () => {
  it("accepts valid full input", () => {
    const result = changeVehicleStatusSchema.safeParse(VALID_FULL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleId).toBe(VALID_UUID);
      expect(result.data.newStatus).toBe("maintenance");
      expect(result.data.reason).toBe("Vidange planifiée");
      expect(result.data.createMaintenanceRecord).toBe(true);
      expect(result.data.maintenanceDescription).toBe("Vidange + filtres");
      expect(result.data.maintenanceType).toBe("regular_service");
    }
  });

  it("accepts valid minimal input", () => {
    const result = changeVehicleStatusSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleId).toBe(VALID_UUID);
      expect(result.data.newStatus).toBe("maintenance");
      expect(result.data.reason).toBeUndefined();
      expect(result.data.createMaintenanceRecord).toBe(false);
    }
  });

  it("rejects invalid vehicleId (not a UUID)", () => {
    const result = changeVehicleStatusSchema.safeParse({
      ...VALID_MINIMAL,
      vehicleId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "vehicleId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid newStatus value", () => {
    const result = changeVehicleStatusSchema.safeParse({
      ...VALID_MINIMAL,
      newStatus: "destroyed",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "newStatus");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects reason > 500 chars", () => {
    const result = changeVehicleStatusSchema.safeParse({
      ...VALID_MINIMAL,
      reason: "x".repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "reason");
      expect(err?.message).toContain("500 caractères");
    }
  });

  it("transforms empty reason to undefined", () => {
    const result = changeVehicleStatusSchema.safeParse({
      ...VALID_MINIMAL,
      reason: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBeUndefined();
    }
  });

  it("defaults createMaintenanceRecord to false", () => {
    const result = changeVehicleStatusSchema.safeParse({
      vehicleId: VALID_UUID,
      newStatus: "available",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createMaintenanceRecord).toBe(false);
    }
  });

  it("rejects maintenanceDescription > 2000 chars", () => {
    const result = changeVehicleStatusSchema.safeParse({
      ...VALID_FULL,
      maintenanceDescription: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "maintenanceDescription"
      );
      expect(err?.message).toContain("2000 caractères");
    }
  });

  it("requires maintenanceDescription when createMaintenanceRecord is true", () => {
    const result = changeVehicleStatusSchema.safeParse({
      vehicleId: VALID_UUID,
      newStatus: "maintenance",
      createMaintenanceRecord: true,
      maintenanceType: "repair",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "maintenanceDescription"
      );
      expect(err?.message).toContain("requise");
    }
  });
});

describe("ALLOWED_TRANSITIONS", () => {
  it("maps all statuses correctly", () => {
    expect(ALLOWED_TRANSITIONS.available).toEqual([
      "maintenance",
      "out_of_service",
    ]);
    expect(ALLOWED_TRANSITIONS.rented).toEqual([]);
    expect(ALLOWED_TRANSITIONS.maintenance).toEqual([
      "available",
      "out_of_service",
    ]);
    expect(ALLOWED_TRANSITIONS.out_of_service).toEqual([
      "available",
      "maintenance",
    ]);
  });
});
