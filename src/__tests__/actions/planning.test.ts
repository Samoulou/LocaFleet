import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { getPlanningData } from "@/actions/planning";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "t0000000-0000-4000-8000-000000000001";
const VEHICLE_ID_1 = "b0000000-0000-4000-8000-000000000001";
const VEHICLE_ID_2 = "b0000000-0000-4000-8000-000000000002";
const VEHICLE_ID_3 = "b0000000-0000-4000-8000-000000000003";

const ADMIN_USER = {
  id: "a0000000-0000-4000-8000-000000000001",
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

const VIEWER_USER = {
  id: "a0000000-0000-4000-8000-000000000003",
  tenantId: TENANT_ID,
  role: "viewer" as const,
  email: "viewer@locafleet.ch",
  name: "Viewer Test",
  isActive: true,
};

const INACTIVE_USER = {
  ...ADMIN_USER,
  id: "a0000000-0000-4000-8000-000000000004",
  isActive: false,
};

const RANGE_START = "2026-06-01";
const RANGE_END = "2026-06-30";

// ============================================================================
// DB mock helpers
// ============================================================================

type SelectRow = Record<string, unknown>;

/**
 * Builds a chainable, thenable select chain: every chain method returns the
 * chain itself, and the chain is also a Promise resolving to `result`, so it
 * can be awaited at any depth (after .where(), .orderBy(), .leftJoin(), ...).
 */
function makeSelectChain(result: SelectRow[]) {
  const methods = {
    from: vi.fn(),
    where: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    groupBy: vi.fn(),
  };
  const chain = Object.assign(Promise.resolve(result), methods);
  for (const fn of Object.values(methods)) {
    fn.mockReturnValue(chain);
  }
  return chain;
}

/**
 * Each db.select() call consumes the next result in the sequence.
 * Query order in getPlanningData: 1. vehicles, 2. contracts, 3. maintenance.
 */
function mockSelectSequence(results: SelectRow[][]) {
  let callIndex = 0;
  vi.mocked(db.select).mockImplementation(() => {
    const current = results[callIndex] ?? [];
    callIndex++;
    return makeSelectChain(current) as never;
  });
}

function mockSelectThrows(message = "DB connection failed") {
  vi.mocked(db.select).mockImplementation(() => {
    throw new Error(message);
  });
}

// ============================================================================
// Fixtures
// ============================================================================

const VEHICLE_ROWS: SelectRow[] = [
  {
    id: VEHICLE_ID_1,
    brand: "Audi",
    model: "A3",
    plateNumber: "GE 123456",
    status: "rented",
    dailyRateOverride: "95.00",
    categoryName: "Compacte",
    categoryDailyRate: "85.00",
  },
  {
    id: VEHICLE_ID_2,
    brand: "VW",
    model: "Golf",
    plateNumber: "VD 654321",
    status: "available",
    dailyRateOverride: null,
    categoryName: "Compacte",
    categoryDailyRate: "85.00",
  },
  {
    id: VEHICLE_ID_3,
    brand: "Skoda",
    model: "Fabia",
    plateNumber: "VS 111222",
    status: "maintenance",
    dailyRateOverride: null,
    categoryName: null,
    categoryDailyRate: null,
  },
];

const CONTRACT_START = new Date("2026-06-05T09:00:00");
const CONTRACT_END = new Date("2026-06-12T09:00:00");

const CONTRACT_ROWS: SelectRow[] = [
  {
    id: "r0000000-0000-4000-8000-000000000001",
    contractNumber: "CTR-2026-0042",
    clientFirstName: "Jean",
    clientLastName: "Dupont",
    vehicleId: VEHICLE_ID_1,
    startDate: CONTRACT_START,
    endDate: CONTRACT_END,
    status: "active",
    totalAmount: "1250.00",
  },
  {
    id: "r0000000-0000-4000-8000-000000000002",
    contractNumber: "CTR-2026-0043",
    clientFirstName: "Marie",
    clientLastName: "Martin",
    vehicleId: VEHICLE_ID_1,
    startDate: new Date("2026-06-20T09:00:00"),
    endDate: new Date("2026-06-25T09:00:00"),
    status: "approved",
    totalAmount: "475.00",
  },
];

const MAINTENANCE_START = new Date("2026-06-10T08:00:00");

const MAINTENANCE_ROWS: SelectRow[] = [
  {
    id: "m0000000-0000-4000-8000-000000000001",
    vehicleId: VEHICLE_ID_3,
    type: "repair",
    status: "in_progress",
    description: "Remplacement embrayage",
    startDate: MAINTENANCE_START,
    endDate: null,
  },
];

// ============================================================================
// getPlanningData
// ============================================================================

describe("getPlanningData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns vehicles with contracts and maintenance grouped per vehicle", async () => {
    mockSelectSequence([VEHICLE_ROWS, CONTRACT_ROWS, MAINTENANCE_ROWS]);

    const result = await getPlanningData(RANGE_START, RANGE_END);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(3);
      expect(db.select).toHaveBeenCalledTimes(3);

      // Vehicle 1: two contracts, no maintenance
      const v1 = result.data.vehicles[0];
      expect(v1.id).toBe(VEHICLE_ID_1);
      expect(v1.name).toBe("Audi A3");
      expect(v1.plateNumber).toBe("GE 123456");
      expect(v1.contracts).toHaveLength(2);
      expect(v1.maintenance).toHaveLength(0);
      expect(v1.contracts[0]).toEqual({
        id: "r0000000-0000-4000-8000-000000000001",
        contractNumber: "CTR-2026-0042",
        clientName: "Jean Dupont",
        vehicleId: VEHICLE_ID_1,
        vehicleName: "Audi A3",
        plateNumber: "GE 123456",
        startDate: CONTRACT_START,
        endDate: CONTRACT_END,
        status: "active",
        totalAmount: "1250.00",
      });
      expect(v1.contracts[1].clientName).toBe("Marie Martin");

      // Vehicle 2: nothing scheduled
      const v2 = result.data.vehicles[1];
      expect(v2.contracts).toHaveLength(0);
      expect(v2.maintenance).toHaveLength(0);

      // Vehicle 3: one open-ended maintenance, no contracts
      const v3 = result.data.vehicles[2];
      expect(v3.contracts).toHaveLength(0);
      expect(v3.maintenance).toHaveLength(1);
      expect(v3.maintenance[0]).toEqual({
        id: "m0000000-0000-4000-8000-000000000001",
        type: "repair",
        status: "in_progress",
        description: "Remplacement embrayage",
        startDate: MAINTENANCE_START,
        endDate: null,
      });
    }
  });

  it("echoes the requested date-range params in the response", async () => {
    mockSelectSequence([[], [], []]);

    const result = await getPlanningData("2026-07-01", "2026-07-31");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBe("2026-07-01");
      expect(result.data.endDate).toBe("2026-07-31");
    }
  });

  it("computes dailyRate from override, then category rate, then 0", async () => {
    mockSelectSequence([VEHICLE_ROWS, [], []]);

    const result = await getPlanningData(RANGE_START, RANGE_END);

    expect(result.success).toBe(true);
    if (result.success) {
      // Override wins over category rate
      expect(result.data.vehicles[0].dailyRate).toBe(95);
      expect(result.data.vehicles[0].categoryName).toBe("Compacte");
      // No override: falls back to category rate
      expect(result.data.vehicles[1].dailyRate).toBe(85);
      // Neither override nor category: 0
      expect(result.data.vehicles[2].dailyRate).toBe(0);
      expect(result.data.vehicles[2].categoryName).toBeNull();
    }
  });

  it("returns an empty fleet when no vehicles exist", async () => {
    mockSelectSequence([[], [], []]);

    const result = await getPlanningData(RANGE_START, RANGE_END);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toEqual([]);
    }
  });

  it("succeeds for viewer (contracts read is allowed for viewer)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockSelectSequence([[], [], []]);

    const result = await getPlanningData(RANGE_START, RANGE_END);

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getPlanningData(RANGE_START, RANGE_END);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User is not authenticated");
    }
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects inactive user account", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(INACTIVE_USER);

    const result = await getPlanningData(RANGE_START, RANGE_END);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User account is inactive");
    }
  });

  it("returns French error message on DB failure", async () => {
    mockSelectThrows();

    const result = await getPlanningData(RANGE_START, RANGE_END);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement du planning"
      );
    }
  });
});
