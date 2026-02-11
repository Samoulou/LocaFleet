import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { createAuditLog, getEntityAuditLogs } from "@/actions/audit-logs";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const USER_ID = "d0000000-0000-4000-8000-000000000001";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const LOG_ID = "e0000000-0000-4000-8000-000000000001";

const ADMIN_USER = {
  id: USER_ID,
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

// ============================================================================
// DB mock helpers
// ============================================================================

function mockInsertChain() {
  const values = vi.fn().mockResolvedValue(undefined);
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values };
}

function mockSelectChain(results: unknown[]) {
  const resolvedValue = Promise.resolve(results);
  const limit = vi.fn().mockReturnValue(resolvedValue);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy });
  const leftJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ leftJoin });
  vi.mocked(db.select).mockReturnValue({ from } as never);
  return { from, leftJoin, where, orderBy, limit };
}

// ============================================================================
// createAuditLog
// ============================================================================

describe("createAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts audit log correctly", async () => {
    const { values } = mockInsertChain();

    await createAuditLog({
      tenantId: TENANT_ID,
      userId: USER_ID,
      action: "status_change",
      entityType: "vehicle",
      entityId: VEHICLE_ID,
      changes: { from: "available", to: "maintenance" },
      metadata: { reason: "Vidange" },
    });

    expect(db.insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        userId: USER_ID,
        action: "status_change",
        entityType: "vehicle",
        entityId: VEHICLE_ID,
        changes: { from: "available", to: "maintenance" },
        metadata: { reason: "Vidange" },
      })
    );
  });

  it("works with transaction (trx)", async () => {
    const mockTrx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    };

    await createAuditLog(
      {
        tenantId: TENANT_ID,
        userId: USER_ID,
        action: "status_change",
        entityType: "vehicle",
        entityId: VEHICLE_ID,
      },
      mockTrx as never
    );

    expect(mockTrx.insert).toHaveBeenCalled();
    // Should NOT use the global db
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("handles null changes and metadata", async () => {
    const { values } = mockInsertChain();

    await createAuditLog({
      tenantId: TENANT_ID,
      userId: USER_ID,
      action: "status_change",
      entityType: "vehicle",
      entityId: VEHICLE_ID,
      changes: null,
      metadata: null,
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: null,
        metadata: null,
      })
    );
  });
});

// ============================================================================
// getEntityAuditLogs
// ============================================================================

describe("getEntityAuditLogs", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns audit logs for entity", async () => {
    const mockLog = {
      id: LOG_ID,
      action: "status_change",
      entityType: "vehicle",
      entityId: VEHICLE_ID,
      changes: { from: "available", to: "maintenance" },
      metadata: null,
      createdAt: new Date("2025-01-15"),
      userName: "Admin Test",
    };
    mockSelectChain([mockLog]);

    const result = await getEntityAuditLogs("vehicle", VEHICLE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe("status_change");
      expect(result.data[0].userName).toBe("Admin Test");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getEntityAuditLogs("vehicle", VEHICLE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getEntityAuditLogs("vehicle", VEHICLE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
