import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { listVehicles, listVehicleCategories } from "@/actions/vehicles";

// ============================================================================
// DB mock helpers
// ============================================================================

function mockVehicleSelectChain(
  dataResult: unknown[] = [],
  countResult: { value: number }[] = [{ value: 0 }]
) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const currentCall = callIndex++;

    if (currentCall === 0) {
      // Data query chain: select -> from -> leftJoin -> where -> orderBy -> limit -> offset
      const offset = vi.fn().mockResolvedValue(dataResult);
      const limit = vi.fn().mockReturnValue({ offset });
      const orderBy = vi.fn().mockReturnValue({ limit });
      const where = vi.fn().mockReturnValue({ orderBy });
      const leftJoin = vi.fn().mockReturnValue({ where });
      const from = vi.fn().mockReturnValue({ leftJoin });
      return { from } as never;
    }

    // Count query chain: select -> from -> where
    const where = vi.fn().mockResolvedValue(countResult);
    const from = vi.fn().mockReturnValue({ where });
    return { from } as never;
  });
}

function mockCategorySelectChain(returnValue: unknown[] = []) {
  const orderBy = vi.fn().mockResolvedValue(returnValue);
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
  return { from, where, orderBy };
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

const MOCK_VEHICLE = {
  id: "v0000000-0000-4000-8000-000000000001",
  brand: "BMW",
  model: "X3",
  plateNumber: "VD 123456",
  categoryId: "c0000000-0000-4000-8000-000000000001",
  categoryName: "SUV",
  mileage: 45230,
  status: "available" as const,
  coverPhotoUrl: null,
};

const MOCK_CATEGORY = {
  id: "c0000000-0000-4000-8000-000000000001",
  name: "SUV",
};

// ============================================================================
// listVehicles
// ============================================================================

describe("listVehicles", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns paginated vehicles for admin", async () => {
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({ page: 1, pageSize: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
      expect(result.data.vehicles[0].brand).toBe("BMW");
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.totalCount).toBe(1);
    }
  });

  it("returns paginated vehicles for agent", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(AGENT_USER);
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
    }
  });

  it("returns paginated vehicles for viewer (read-only works)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(VIEWER_USER);
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
    }
  });

  it("returns error when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await listVehicles({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("filters by status when param provided", async () => {
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({ status: "available" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles[0].status).toBe("available");
    }
  });

  it("filters by category when param provided", async () => {
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({
      category: "c0000000-0000-4000-8000-000000000001",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
    }
  });

  it("searches by brand/model/plateNumber", async () => {
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({ search: "BMW" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
    }
  });

  it("returns empty list with totalCount=0", async () => {
    mockVehicleSelectChain([], [{ value: 0 }]);

    const result = await listVehicles({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
      expect(result.data.totalPages).toBe(0);
    }
  });

  it("computes totalPages correctly (45 items / 20 = 3 pages)", async () => {
    mockVehicleSelectChain([], [{ value: 45 }]);

    const result = await listVehicles({ page: 1, pageSize: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalPages).toBe(3);
      expect(result.data.totalCount).toBe(45);
    }
  });

  it("rejects invalid params (bad status)", async () => {
    const result = await listVehicles({ status: "flying" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("statut");
    }
  });

  it("handles DB error gracefully (French error)", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await listVehicles({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// listVehicleCategories
// ============================================================================

describe("listVehicleCategories", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns categories for authorized user", async () => {
    mockCategorySelectChain([MOCK_CATEGORY]);

    const result = await listVehicleCategories();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("SUV");
    }
  });

  it("returns error when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await listVehicleCategories();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("returns empty array when no categories", async () => {
    mockCategorySelectChain([]);

    const result = await listVehicleCategories();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});
