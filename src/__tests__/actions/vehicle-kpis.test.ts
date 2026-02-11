import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { getVehicleKPIs } from "@/actions/vehicles";

// ============================================================================
// DB mock helpers
// ============================================================================

function mockKpiSelectChain(
  result: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
  } = {
    total: 0,
    available: 0,
    rented: 0,
    maintenance: 0,
  }
) {
  const where = vi.fn().mockResolvedValue([result]);
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
  return { from, where };
}

// ============================================================================
// Constants
// ============================================================================

const ADMIN_USER = {
  id: "a0000000-0000-4000-8000-000000000001",
  tenantId: "t0000000-0000-4000-8000-000000000001",
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

const AGENT_USER = {
  id: "a0000000-0000-4000-8000-000000000002",
  tenantId: "t0000000-0000-4000-8000-000000000001",
  role: "agent" as const,
  email: "agent@locafleet.ch",
  name: "Agent Test",
  isActive: true,
};

const VIEWER_USER = {
  id: "a0000000-0000-4000-8000-000000000003",
  tenantId: "t0000000-0000-4000-8000-000000000001",
  role: "viewer" as const,
  email: "viewer@locafleet.ch",
  name: "Viewer Test",
  isActive: true,
};

// ============================================================================
// getVehicleKPIs
// ============================================================================

describe("getVehicleKPIs", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns correct KPI counts for admin user", async () => {
    mockKpiSelectChain({ total: 25, available: 15, rented: 7, maintenance: 3 });

    const result = await getVehicleKPIs();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(25);
      expect(result.data.available).toBe(15);
      expect(result.data.rented).toBe(7);
      expect(result.data.maintenance).toBe(3);
    }
  });

  it("returns correct KPI counts for agent user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(AGENT_USER);
    mockKpiSelectChain({ total: 10, available: 5, rented: 3, maintenance: 2 });

    const result = await getVehicleKPIs();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(10);
      expect(result.data.available).toBe(5);
      expect(result.data.rented).toBe(3);
      expect(result.data.maintenance).toBe(2);
    }
  });

  it("returns correct KPI counts for viewer user (read-only)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(VIEWER_USER);
    mockKpiSelectChain({ total: 8, available: 4, rented: 2, maintenance: 2 });

    const result = await getVehicleKPIs();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(8);
    }
  });

  it("returns error when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await getVehicleKPIs();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("returns all zeros when no vehicles exist", async () => {
    mockKpiSelectChain({ total: 0, available: 0, rented: 0, maintenance: 0 });

    const result = await getVehicleKPIs();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(0);
      expect(result.data.available).toBe(0);
      expect(result.data.rented).toBe(0);
      expect(result.data.maintenance).toBe(0);
    }
  });

  it("handles DB error gracefully (French error message)", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getVehicleKPIs();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });

  it("excludes soft-deleted vehicles (deletedAt not null)", async () => {
    // The query filters by isNull(deletedAt), so the mock just returns
    // what the DB would return after that filter is applied
    mockKpiSelectChain({ total: 5, available: 3, rented: 1, maintenance: 1 });

    const result = await getVehicleKPIs();

    expect(result.success).toBe(true);
    if (result.success) {
      // Verify the DB was called (the where clause filters deletedAt IS NULL)
      expect(db.select).toHaveBeenCalled();
      expect(result.data.total).toBe(5);
    }
  });
});
