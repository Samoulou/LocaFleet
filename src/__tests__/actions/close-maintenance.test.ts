import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { closeMaintenanceRecord } from "@/actions/maintenance";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const MAINTENANCE_ID = "c0000000-0000-4000-8000-000000000001";
const OTHER_MAINTENANCE_ID = "c0000000-0000-4000-8000-000000000002";

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
  maintenanceId: MAINTENANCE_ID,
  endDate: "2025-06-15",
  finalCost: 450,
  notes: "Travaux terminés",
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

function mockUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return { set, where };
}

function mockInsertChain() {
  const returningFn = vi.fn().mockResolvedValue([]);
  const values = vi.fn().mockReturnValue({ returning: returningFn });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values, returning: returningFn };
}

// ============================================================================
// Tests
// ============================================================================

describe("closeMaintenanceRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockUpdateChain();
    mockInsertChain();
  });

  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("closes record for admin — success with id", async () => {
    // 1st select: fetch maintenance record (inside tx)
    // 2nd select: check other open records (none)
    mockSelectChainSequence([
      [{ id: MAINTENANCE_ID, vehicleId: VEHICLE_ID, status: "open" }],
      [],
    ]);

    const result = await closeMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(MAINTENANCE_ID);
    }
  });

  it("closes record for agent — success", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    // 1st select: fetch maintenance record (inside tx)
    // 2nd select: check other open records (none)
    mockSelectChainSequence([
      [{ id: MAINTENANCE_ID, vehicleId: VEHICLE_ID, status: "in_progress" }],
      [],
    ]);

    const result = await closeMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(MAINTENANCE_ID);
    }
  });

  // --------------------------------------------------------------------------
  // Auth checks
  // --------------------------------------------------------------------------

  it("rejects viewer (no permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await closeMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await closeMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  // --------------------------------------------------------------------------
  // Business logic errors
  // --------------------------------------------------------------------------

  it("returns error for maintenance record not found", async () => {
    mockSelectChainSequence([[]]);

    const result = await closeMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Cet enregistrement de maintenance n'existe pas"
      );
    }
  });

  it("returns error for already-completed record", async () => {
    mockSelectChainSequence([
      [{ id: MAINTENANCE_ID, vehicleId: VEHICLE_ID, status: "completed" }],
    ]);

    const result = await closeMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette maintenance est déjà clôturée");
    }
  });

  // --------------------------------------------------------------------------
  // Vehicle status logic
  // --------------------------------------------------------------------------

  it("sets vehicle status to available when no other open records", async () => {
    mockSelectChainSequence([
      [{ id: MAINTENANCE_ID, vehicleId: VEHICLE_ID, status: "open" }],
      [], // no other open records
    ]);

    const result = await closeMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(true);
    // update called twice: maintenance record + conditional vehicle status
    expect(db.update).toHaveBeenCalledTimes(2);
  });

  it("does NOT change vehicle status when other open records exist", async () => {
    mockSelectChainSequence([
      [{ id: MAINTENANCE_ID, vehicleId: VEHICLE_ID, status: "open" }],
      [{ id: OTHER_MAINTENANCE_ID }], // other open record exists
    ]);

    const result = await closeMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(true);
    // update is only called once (for the maintenance record itself), not for vehicle
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // DB error
  // --------------------------------------------------------------------------

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await closeMaintenanceRecord(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });

  // --------------------------------------------------------------------------
  // Validation errors
  // --------------------------------------------------------------------------

  it("rejects invalid input (validation error)", async () => {
    const result = await closeMaintenanceRecord({
      maintenanceId: "not-a-uuid",
      endDate: "2025-06-15",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });
});
