import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { createVehicle, updateVehicle, getVehicle } from "@/actions/vehicles";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const CATEGORY_ID = "c0000000-0000-4000-8000-000000000001";

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
  brand: "BMW",
  model: "X3",
  plateNumber: "VD 123456",
  mileage: 45230,
  year: 2023,
  color: "Noir",
  vin: "WBA12345678901234",
  categoryId: CATEGORY_ID,
  fuelType: "diesel",
  transmission: "automatic",
  seats: 5,
  notes: "Test vehicle",
};

const MOCK_VEHICLE_ROW = {
  id: VEHICLE_ID,
  brand: "BMW",
  model: "X3",
  plateNumber: "VD 123456",
  year: 2023,
  color: "Noir",
  vin: "WBA12345678901234",
  mileage: 45230,
  categoryId: CATEGORY_ID,
  fuelType: "diesel" as const,
  transmission: "automatic" as const,
  seats: 5,
  notes: "Test vehicle",
};

// ============================================================================
// DB mock helpers
// ============================================================================

/**
 * Mocks a db.select chain that returns a single array result.
 * Supports chaining: select -> from -> where -> ...
 * Can be called multiple times to simulate sequential queries.
 */
function mockSelectChainSequence(results: unknown[][]) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const currentResult = results[callIndex] ?? [];
    callIndex++;

    const resolvedValue = Promise.resolve(currentResult);
    const where = vi.fn().mockReturnValue(resolvedValue);
    const leftJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ where, leftJoin });
    return { from } as never;
  });
}

function mockInsertChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const values = vi.fn().mockReturnValue({ returning });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values, returning };
}

function mockUpdateChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return { set, where, returning };
}

// ============================================================================
// createVehicle
// ============================================================================

describe("createVehicle", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("creates vehicle for admin → success with id", async () => {
    // 1st select: plate uniqueness check → no duplicate
    // 2nd select: category validation → found
    mockSelectChainSequence([[], [{ id: CATEGORY_ID }]]);
    mockInsertChain([{ id: VEHICLE_ID }]);

    const result = await createVehicle(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(VEHICLE_ID);
    }
  });

  it("creates vehicle for agent → success", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockSelectChainSequence([[], [{ id: CATEGORY_ID }]]);
    mockInsertChain([{ id: VEHICLE_ID }]);

    const result = await createVehicle(VALID_INPUT);

    expect(result.success).toBe(true);
  });

  it("rejects viewer (no create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await createVehicle(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createVehicle(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects invalid input (missing required fields)", async () => {
    const result = await createVehicle({ brand: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it("rejects duplicate plate number → French error message", async () => {
    // 1st select: plate uniqueness check → found duplicate
    mockSelectChainSequence([[{ id: "other-vehicle-id" }]]);

    const result = await createVehicle(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce numéro d'immatriculation existe déjà");
    }
  });

  it("rejects categoryId from another tenant", async () => {
    // 1st select: plate uniqueness → no duplicate
    // 2nd select: category validation → not found (different tenant)
    mockSelectChainSequence([[], []]);

    const result = await createVehicle(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette catégorie n'existe pas");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await createVehicle(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// updateVehicle
// ============================================================================

describe("updateVehicle", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  const UPDATE_INPUT = { ...VALID_INPUT, id: VEHICLE_ID };

  it("updates vehicle for admin → success", async () => {
    // 1st select: vehicle exists check → found
    // 2nd select: plate uniqueness → no duplicate
    // 3rd select: category validation → found
    mockSelectChainSequence([[{ id: VEHICLE_ID }], [], [{ id: CATEGORY_ID }]]);
    mockUpdateChain([{ id: VEHICLE_ID }]);

    const result = await updateVehicle(UPDATE_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(VEHICLE_ID);
    }
  });

  it("updates vehicle for agent → success", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockSelectChainSequence([[{ id: VEHICLE_ID }], [], [{ id: CATEGORY_ID }]]);
    mockUpdateChain([{ id: VEHICLE_ID }]);

    const result = await updateVehicle(UPDATE_INPUT);

    expect(result.success).toBe(true);
  });

  it("rejects viewer (no update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await updateVehicle(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects vehicle not found (wrong id)", async () => {
    // 1st select: vehicle exists → not found
    mockSelectChainSequence([[]]);

    const result = await updateVehicle(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("rejects vehicle from different tenant", async () => {
    // The WHERE clause filters by tenantId, so vehicle not found
    mockSelectChainSequence([[]]);

    const result = await updateVehicle(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("rejects soft-deleted vehicle", async () => {
    // WHERE clause filters by isNull(deletedAt), so vehicle not found
    mockSelectChainSequence([[]]);

    const result = await updateVehicle(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("rejects duplicate plate number (excluding self)", async () => {
    // 1st select: vehicle exists → found
    // 2nd select: plate uniqueness → found duplicate (different vehicle)
    mockSelectChainSequence([
      [{ id: VEHICLE_ID }],
      [{ id: "other-vehicle-id" }],
    ]);

    const result = await updateVehicle(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce numéro d'immatriculation existe déjà");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await updateVehicle(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// getVehicle
// ============================================================================

describe("getVehicle", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns vehicle for authorized user", async () => {
    mockSelectChainSequence([[MOCK_VEHICLE_ROW]]);

    const result = await getVehicle(VEHICLE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(VEHICLE_ID);
      expect(result.data.brand).toBe("BMW");
      expect(result.data.model).toBe("X3");
      expect(result.data.plateNumber).toBe("VD 123456");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getVehicle(VEHICLE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("returns error for non-existent vehicle", async () => {
    mockSelectChainSequence([[]]);

    const result = await getVehicle("non-existent-id");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("returns error for vehicle from different tenant", async () => {
    // WHERE clause filters by tenantId → not found
    mockSelectChainSequence([[]]);

    const result = await getVehicle(VEHICLE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("returns error for soft-deleted vehicle", async () => {
    // WHERE clause filters by isNull(deletedAt) → not found
    mockSelectChainSequence([[]]);

    const result = await getVehicle(VEHICLE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });
});
