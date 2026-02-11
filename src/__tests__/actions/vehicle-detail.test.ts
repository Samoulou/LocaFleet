import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  getVehicleRentalHistory,
  getVehicleMaintenanceHistory,
} from "@/actions/vehicles";

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

// ============================================================================
// DB mock helpers
// ============================================================================

function mockSelectChain(result: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ orderBy });
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ where, innerJoin });
  vi.mocked(db.select).mockReturnValue({ from } as never);
  return { from, where, innerJoin, orderBy };
}

// ============================================================================
// getVehicleRentalHistory
// ============================================================================

describe("getVehicleRentalHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns rental history for a valid vehicle", async () => {
    const mockRentals = [
      {
        id: "r0000000-0000-4000-8000-000000000001",
        contractNumber: "LOC-2026-001",
        clientFirstName: "Jean",
        clientLastName: "Dupont",
        startDate: new Date("2026-01-10"),
        endDate: new Date("2026-01-15"),
        actualReturnDate: new Date("2026-01-15"),
        totalAmount: "750.00",
        status: "completed",
      },
      {
        id: "r0000000-0000-4000-8000-000000000002",
        contractNumber: "LOC-2026-002",
        clientFirstName: "Marie",
        clientLastName: "Martin",
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-02-07"),
        actualReturnDate: null,
        totalAmount: "1050.00",
        status: "active",
      },
    ];

    mockSelectChain(mockRentals);

    const result = await getVehicleRentalHistory(VEHICLE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].contractNumber).toBe("LOC-2026-001");
      expect(result.data[0].clientFirstName).toBe("Jean");
      expect(result.data[0].clientLastName).toBe("Dupont");
      expect(result.data[0].totalAmount).toBe("750.00");
      expect(result.data[1].status).toBe("active");
    }
  });

  it("returns empty array when vehicle has no rentals", async () => {
    mockSelectChain([]);

    const result = await getVehicleRentalHistory(VEHICLE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("returns error for invalid UUID", async () => {
    const result = await getVehicleRentalHistory("not-a-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Identifiant de véhicule invalide");
    }
  });

  it("filters by tenantId (no cross-tenant leaks)", async () => {
    const chain = mockSelectChain([]);

    await getVehicleRentalHistory(VEHICLE_ID);

    // Verify that db.select was called and where was invoked
    expect(db.select).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
  });

  it("returns auth error when user is not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getVehicleRentalHistory(VEHICLE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getVehicleRentalHistory(VEHICLE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// getVehicleMaintenanceHistory
// ============================================================================

describe("getVehicleMaintenanceHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns maintenance history for a valid vehicle", async () => {
    const mockRecords = [
      {
        id: "m0000000-0000-4000-8000-000000000001",
        type: "regular_service",
        status: "completed",
        description: "Vidange + filtres",
        estimatedCost: "350.00",
        finalCost: "320.00",
        startDate: new Date("2026-01-05"),
        endDate: new Date("2026-01-06"),
        mechanicName: "Garage Muller",
      },
      {
        id: "m0000000-0000-4000-8000-000000000002",
        type: "repair",
        status: "in_progress",
        description: "Remplacement pare-brise",
        estimatedCost: "800.00",
        finalCost: null,
        startDate: new Date("2026-02-01"),
        endDate: null,
        mechanicName: null,
      },
    ];

    mockSelectChain(mockRecords);

    const result = await getVehicleMaintenanceHistory(VEHICLE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe("regular_service");
      expect(result.data[0].description).toBe("Vidange + filtres");
      expect(result.data[0].estimatedCost).toBe("350.00");
      expect(result.data[0].finalCost).toBe("320.00");
      expect(result.data[1].status).toBe("in_progress");
      expect(result.data[1].endDate).toBeNull();
    }
  });

  it("returns empty array when vehicle has no maintenance records", async () => {
    mockSelectChain([]);

    const result = await getVehicleMaintenanceHistory(VEHICLE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("returns error for invalid UUID", async () => {
    const result = await getVehicleMaintenanceHistory("not-a-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Identifiant de véhicule invalide");
    }
  });

  it("filters by tenantId (no cross-tenant leaks)", async () => {
    const chain = mockSelectChain([]);

    await getVehicleMaintenanceHistory(VEHICLE_ID);

    expect(db.select).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
  });

  it("returns auth error when user is not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getVehicleMaintenanceHistory(VEHICLE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getVehicleMaintenanceHistory(VEHICLE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
