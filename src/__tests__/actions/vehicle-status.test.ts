import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { changeVehicleStatus } from "@/actions/vehicle-status";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";

const ADMIN_USER = {
  id: "d0000000-0000-4000-8000-000000000001",
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

const AGENT_USER = {
  id: "d0000000-0000-4000-8000-000000000002",
  tenantId: TENANT_ID,
  role: "agent" as const,
  email: "agent@locafleet.ch",
  name: "Agent Test",
  isActive: true,
};

const VIEWER_USER = {
  id: "d0000000-0000-4000-8000-000000000003",
  tenantId: TENANT_ID,
  role: "viewer" as const,
  email: "viewer@locafleet.ch",
  name: "Viewer Test",
  isActive: true,
};

// ============================================================================
// DB mock helpers
// ============================================================================

/**
 * Mocks a db.select chain that returns different results per sequential call.
 */
function mockSelectChainSequence(results: unknown[][]) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const currentResult = results[callIndex] ?? [];
    callIndex++;

    const resolvedValue = Promise.resolve(currentResult);
    const limit = vi.fn().mockReturnValue(resolvedValue);
    const whereResult = Object.assign(Promise.resolve(currentResult), {
      limit,
    });
    const where = vi.fn().mockReturnValue(whereResult);
    const from = vi.fn().mockReturnValue({ where });
    return { from } as never;
  });
}

function mockInsertChain() {
  const values = vi.fn().mockResolvedValue(undefined);
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values };
}

function mockUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return { set, where };
}

// ============================================================================
// Tests
// ============================================================================

describe("changeVehicleStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    // Default mocks for transaction pass-through (from setup.ts)
    mockUpdateChain();
    mockInsertChain();
  });

  // --------------------------------------------------------------------------
  // Success: valid transitions
  // --------------------------------------------------------------------------

  it("available → maintenance — success", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "available" }]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "maintenance",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(VEHICLE_ID);
      expect(result.data.newStatus).toBe("maintenance");
    }
  });

  it("available → out_of_service — success", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "available" }]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "out_of_service",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newStatus).toBe("out_of_service");
    }
  });

  it("maintenance → available — success", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "maintenance" }]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "available",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newStatus).toBe("available");
    }
  });

  it("out_of_service → maintenance — success", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "out_of_service" }]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "maintenance",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newStatus).toBe("maintenance");
    }
  });

  it("maintenance → out_of_service — success", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "maintenance" }]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "out_of_service",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newStatus).toBe("out_of_service");
    }
  });

  it("out_of_service → available — success", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "out_of_service" }]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "available",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newStatus).toBe("available");
    }
  });

  // --------------------------------------------------------------------------
  // Success: with maintenance record creation
  // --------------------------------------------------------------------------

  it("creates maintenance record when requested", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "available" }]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "maintenance",
      createMaintenanceRecord: true,
      maintenanceDescription: "Vidange + filtres",
      maintenanceType: "regular_service",
    });

    expect(result.success).toBe(true);
    // db.insert should be called (via tx) for both audit log and maintenance
    expect(db.insert).toHaveBeenCalled();
  });

  it("skips maintenance record when not requested", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "available" }]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "maintenance",
      createMaintenanceRecord: false,
    });

    expect(result.success).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Blocked transitions
  // --------------------------------------------------------------------------

  it("blocks rented with active contract — French error", async () => {
    // 1st select: vehicle found with "rented" status
    // 2nd select: active contract found
    mockSelectChainSequence([
      [{ id: VEHICLE_ID, status: "rented" }],
      [{ id: "contract-1" }],
    ]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "available",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Ce véhicule a un contrat actif. Terminez le contrat d'abord."
      );
    }
  });

  it("blocks invalid transition (available → available)", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "available" }]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "available",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Le véhicule est déjà dans ce statut");
    }
  });

  it("blocks manual set to rented", async () => {
    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "rented",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("contrat de location");
    }
  });

  it("blocks invalid transition (available → rented disallowed by schema then by code)", async () => {
    // Even if it were allowed by schema, the defensive check blocks it
    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "rented",
    });

    expect(result.success).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Vehicle not found / soft-deleted
  // --------------------------------------------------------------------------

  it("returns error for vehicle not found", async () => {
    mockSelectChainSequence([[]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "maintenance",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("returns error for soft-deleted vehicle", async () => {
    // WHERE clause includes isNull(deletedAt) → not found
    mockSelectChainSequence([[]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "maintenance",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  // --------------------------------------------------------------------------
  // Auth checks
  // --------------------------------------------------------------------------

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "maintenance",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer (no update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "maintenance",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("allows agent with update permission", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "available" }]]);

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "maintenance",
    });

    expect(result.success).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Invalid input / DB error
  // --------------------------------------------------------------------------

  it("rejects invalid input (bad UUID)", async () => {
    const result = await changeVehicleStatus({
      vehicleId: "not-a-uuid",
      newStatus: "maintenance",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await changeVehicleStatus({
      vehicleId: VEHICLE_ID,
      newStatus: "maintenance",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
