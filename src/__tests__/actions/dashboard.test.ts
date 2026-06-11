import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  getDashboardStats,
  getActiveRentals,
  getReturnsDue,
  getMaintenanceAlerts,
} from "@/actions/dashboard";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "t0000000-0000-4000-8000-000000000001";

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

// ============================================================================
// DB mock helpers
// ============================================================================

type SelectRow = Record<string, unknown>;

/**
 * Builds a chainable, thenable select chain: every chain method returns the
 * chain itself, and the chain is also a Promise resolving to `result`, so it
 * can be awaited at any depth (after .where(), .orderBy(), .limit(), ...).
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

/** Each db.select() call consumes the next result in the sequence. */
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
// getDashboardStats
// ============================================================================

describe("getDashboardStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("maps the six aggregation queries to the stats object", async () => {
    // Query order: activeRentals, returnsDueToday, overdueReturns,
    // vehiclesInMaintenance, availableVehicles, monthlyRevenue
    mockSelectSequence([
      [{ count: 12 }],
      [{ count: 3 }],
      [{ count: 2 }],
      [{ count: 4 }],
      [{ count: 9 }],
      [{ total: 15250.5 }],
    ]);

    const result = await getDashboardStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        activeRentals: 12,
        returnsDueToday: 3,
        overdueReturns: 2,
        vehiclesInMaintenance: 4,
        availableVehicles: 9,
        monthlyRevenue: 15250.5,
      });
    }
    expect(db.select).toHaveBeenCalledTimes(6);
  });

  it("converts a string revenue total (decimal from pg) to a number", async () => {
    mockSelectSequence([
      [{ count: 1 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 0 }],
      [{ count: 1 }],
      [{ total: "1250.00" }],
    ]);

    const result = await getDashboardStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.monthlyRevenue).toBe(1250);
    }
  });

  it("falls back to zeros when queries return empty result sets", async () => {
    mockSelectSequence([[], [], [], [], [], []]);

    const result = await getDashboardStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        activeRentals: 0,
        returnsDueToday: 0,
        overdueReturns: 0,
        vehiclesInMaintenance: 0,
        availableVehicles: 0,
        monthlyRevenue: 0,
      });
    }
  });

  it("succeeds for viewer (contracts read is allowed for viewer)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockSelectSequence([
      [{ count: 1 }],
      [{ count: 1 }],
      [{ count: 1 }],
      [{ count: 1 }],
      [{ count: 1 }],
      [{ total: 100 }],
    ]);

    const result = await getDashboardStats();

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getDashboardStats();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User is not authenticated");
    }
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects inactive user account", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(INACTIVE_USER);

    const result = await getDashboardStats();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User account is inactive");
    }
  });

  it("returns French error message on DB failure", async () => {
    mockSelectThrows();

    const result = await getDashboardStats();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement des statistiques"
      );
    }
  });
});

// ============================================================================
// getActiveRentals
// ============================================================================

describe("getActiveRentals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns active rentals with joined client and vehicle names", async () => {
    const startDate = new Date("2026-06-08T09:00:00");
    const endDate = new Date("2026-06-15T09:00:00");
    mockSelectSequence([
      [
        {
          id: "r0000000-0000-4000-8000-000000000001",
          contractNumber: "CTR-2026-0042",
          clientFirstName: "Jean",
          clientLastName: "Dupont",
          vehicleBrand: "Audi",
          vehicleModel: "A3",
          plateNumber: "GE 123456",
          startDate,
          endDate,
          totalAmount: "1250.00",
        },
        {
          id: "r0000000-0000-4000-8000-000000000002",
          contractNumber: "CTR-2026-0043",
          clientFirstName: "Marie",
          clientLastName: "Martin",
          vehicleBrand: "VW",
          vehicleModel: "Golf",
          plateNumber: "VD 654321",
          startDate,
          endDate,
          totalAmount: "890.50",
        },
      ],
    ]);

    const result = await getActiveRentals();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: "r0000000-0000-4000-8000-000000000001",
        contractNumber: "CTR-2026-0042",
        clientName: "Jean Dupont",
        vehicleName: "Audi A3",
        plateNumber: "GE 123456",
        startDate,
        endDate,
        totalAmount: "1250.00",
      });
      expect(result.data[1].clientName).toBe("Marie Martin");
      expect(result.data[1].vehicleName).toBe("VW Golf");
      expect(result.data[1].totalAmount).toBe("890.50");
    }
  });

  it("returns an empty list when no active rentals exist", async () => {
    mockSelectSequence([[]]);

    const result = await getActiveRentals();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getActiveRentals();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User is not authenticated");
    }
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects inactive user account", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(INACTIVE_USER);

    const result = await getActiveRentals();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User account is inactive");
    }
  });

  it("returns French error message on DB failure", async () => {
    mockSelectThrows();

    const result = await getActiveRentals();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement des locations actives"
      );
    }
  });
});

// ============================================================================
// getReturnsDue
// ============================================================================

describe("getReturnsDue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  function todayAtMidnight(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  it("marks a return due today as not overdue (daysOverdue = 0)", async () => {
    const today = todayAtMidnight();
    mockSelectSequence([
      [
        {
          id: "r0000000-0000-4000-8000-000000000010",
          contractNumber: "CTR-2026-0050",
          clientFirstName: "Luc",
          clientLastName: "Favre",
          vehicleBrand: "BMW",
          vehicleModel: "X1",
          plateNumber: "GE 111222",
          endDate: today,
        },
      ],
    ]);

    const result = await getReturnsDue();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].isOverdue).toBe(false);
      expect(result.data[0].daysOverdue).toBe(0);
      expect(result.data[0].clientName).toBe("Luc Favre");
      expect(result.data[0].vehicleName).toBe("BMW X1");
    }
  });

  it("computes daysOverdue for a return 3 days past its endDate", async () => {
    const today = todayAtMidnight();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    mockSelectSequence([
      [
        {
          id: "r0000000-0000-4000-8000-000000000011",
          contractNumber: "CTR-2026-0051",
          clientFirstName: "Anna",
          clientLastName: "Keller",
          vehicleBrand: "Skoda",
          vehicleModel: "Octavia",
          plateNumber: "VS 333444",
          endDate: threeDaysAgo,
        },
      ],
    ]);

    const result = await getReturnsDue();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].isOverdue).toBe(true);
      expect(result.data[0].daysOverdue).toBe(3);
      expect(result.data[0].endDate).toEqual(threeDaysAgo);
    }
  });

  it("marks a return due 1 day ago as overdue by exactly 1 day", async () => {
    const today = todayAtMidnight();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    mockSelectSequence([
      [
        {
          id: "r0000000-0000-4000-8000-000000000012",
          contractNumber: "CTR-2026-0052",
          clientFirstName: "Paul",
          clientLastName: "Rochat",
          vehicleBrand: "Toyota",
          vehicleModel: "Yaris",
          plateNumber: "FR 555666",
          endDate: yesterday,
        },
      ],
    ]);

    const result = await getReturnsDue();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].isOverdue).toBe(true);
      expect(result.data[0].daysOverdue).toBe(1);
    }
  });

  it("returns an empty list when nothing is due", async () => {
    mockSelectSequence([[]]);

    const result = await getReturnsDue();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getReturnsDue();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User is not authenticated");
    }
  });

  it("returns French error message on DB failure", async () => {
    mockSelectThrows();

    const result = await getReturnsDue();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement des retours"
      );
    }
  });
});

// ============================================================================
// getMaintenanceAlerts
// ============================================================================

describe("getMaintenanceAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns maintenance alerts with joined vehicle names", async () => {
    mockSelectSequence([
      [
        {
          id: "m0000000-0000-4000-8000-000000000001",
          vehicleBrand: "Audi",
          vehicleModel: "A4",
          plateNumber: "GE 777888",
          type: "repair",
          status: "open",
          urgency: "high",
          description: "Plaquettes de frein à remplacer",
        },
        {
          id: "m0000000-0000-4000-8000-000000000002",
          vehicleBrand: "VW",
          vehicleModel: "Polo",
          plateNumber: "VD 999000",
          type: "service",
          status: "in_progress",
          urgency: "low",
          description: "Service annuel",
        },
      ],
    ]);

    const result = await getMaintenanceAlerts();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: "m0000000-0000-4000-8000-000000000001",
        vehicleName: "Audi A4",
        plateNumber: "GE 777888",
        type: "repair",
        status: "open",
        urgency: "high",
        description: "Plaquettes de frein à remplacer",
      });
      expect(result.data[1].vehicleName).toBe("VW Polo");
    }
  });

  it("defaults urgency to 'medium' when null", async () => {
    mockSelectSequence([
      [
        {
          id: "m0000000-0000-4000-8000-000000000003",
          vehicleBrand: "Seat",
          vehicleModel: "Ibiza",
          plateNumber: "NE 121212",
          type: "repair",
          status: "open",
          urgency: null,
          description: "Pneu crevé",
        },
      ],
    ]);

    const result = await getMaintenanceAlerts();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].urgency).toBe("medium");
    }
  });

  it("succeeds for viewer (vehicles read is allowed for viewer)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockSelectSequence([[]]);

    const result = await getMaintenanceAlerts();

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getMaintenanceAlerts();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User is not authenticated");
    }
  });

  it("rejects inactive user account", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(INACTIVE_USER);

    const result = await getMaintenanceAlerts();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User account is inactive");
    }
  });

  it("returns French error message on DB failure", async () => {
    mockSelectThrows();

    const result = await getMaintenanceAlerts();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement des alertes de maintenance"
      );
    }
  });
});
