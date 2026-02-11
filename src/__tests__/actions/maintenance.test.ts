import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { createMaintenanceRecord } from "@/actions/maintenance";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const MAINTENANCE_ID = "c0000000-0000-4000-8000-000000000001";

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

const VALID_INPUT = {
  vehicleId: VEHICLE_ID,
  type: "regular_service",
  description: "Vidange + filtres",
  startDate: "2025-06-01",
  urgency: "medium",
};

// ============================================================================
// DB mock helpers
// ============================================================================

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

function mockInsertChain(returning?: unknown[]) {
  const returningFn = vi
    .fn()
    .mockResolvedValue(returning ?? [{ id: MAINTENANCE_ID }]);
  const values = vi.fn().mockReturnValue({ returning: returningFn });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values, returning: returningFn };
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

describe("createMaintenanceRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockUpdateChain();
    mockInsertChain();
  });

  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("creates record for admin — success with id", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "available" }]]);

    const result = await createMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(MAINTENANCE_ID);
    }
  });

  it("creates record for agent (has vehicles:create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "available" }]]);

    const result = await createMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(MAINTENANCE_ID);
    }
  });

  it("updates vehicle status to maintenance when vehicle is available", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "available" }]]);

    const result = await createMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(true);
    // update is called via transaction (for vehicle status change)
    expect(db.update).toHaveBeenCalled();
  });

  it("does NOT update vehicle status when already maintenance", async () => {
    mockSelectChainSequence([[{ id: VEHICLE_ID, status: "maintenance" }]]);

    const result = await createMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(true);
    // insert is called (maintenance record + audit log) but update should NOT be called
    expect(db.insert).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Validation errors
  // --------------------------------------------------------------------------

  it("rejects missing description (validation error)", async () => {
    const result = await createMaintenanceRecord({
      vehicleId: VEHICLE_ID,
      type: "repair",
      startDate: "2025-06-01",
      description: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("requise");
    }
  });

  it("rejects invalid vehicleId (bad UUID)", async () => {
    const result = await createMaintenanceRecord({
      ...VALID_INPUT,
      vehicleId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  // --------------------------------------------------------------------------
  // Vehicle not found / soft-deleted
  // --------------------------------------------------------------------------

  it("returns error for vehicle not found", async () => {
    mockSelectChainSequence([[]]);

    const result = await createMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("returns error for soft-deleted vehicle", async () => {
    // WHERE clause includes isNull(deletedAt) → not found
    mockSelectChainSequence([[]]);

    const result = await createMaintenanceRecord(VALID_INPUT);

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

    const result = await createMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer (no create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await createMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  // --------------------------------------------------------------------------
  // DB error
  // --------------------------------------------------------------------------

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await createMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
