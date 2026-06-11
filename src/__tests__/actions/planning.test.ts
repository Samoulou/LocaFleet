import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { getPlanningData } from "@/actions/planning";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const EVENT_ID = "e0000000-0000-4000-8000-000000000001";

const ADMIN_USER = {
  id: "d0000000-0000-4000-8000-000000000001",
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

const EMPLOYEE_USER = {
  id: "d0000000-0000-4000-8000-000000000050",
  tenantId: TENANT_ID,
  role: "employee" as const,
  email: "employee@locafleet.ch",
  name: "Employee Test",
  isActive: true,
};

const VEHICLE_ROW = {
  id: VEHICLE_ID,
  brand: "Renault",
  model: "Master",
  plateNumber: "GE 12345",
  status: "available",
  dailyRateOverride: null,
  categoryName: "Utilitaire",
  categoryDailyRate: "75.00",
};

const CONTRACT_ROW = {
  id: "contract-1",
  contractNumber: "CTR-2026-0001",
  clientFirstName: "Jean",
  clientLastName: "Dupont",
  vehicleId: VEHICLE_ID,
  startDate: new Date("2026-07-01T08:00:00"),
  endDate: new Date("2026-07-03T08:00:00"),
  status: "active",
  totalAmount: "450.00",
};

const EVENT_ROW = {
  id: EVENT_ID,
  eventNumber: "EVT-2026-0001",
  title: "Déménagement Dupont",
  vehicleId: VEHICLE_ID,
  clientFirstName: "Jean",
  clientLastName: "Dupont",
  fonctionName: "Déménagement",
  fonctionColor: "#D97706",
  startDate: new Date("2026-07-05T08:00:00"),
  endDate: new Date("2026-07-05T18:00:00"),
  status: "confirmed",
};

// ============================================================================
// DB mock helpers
// ============================================================================

function mockSelectSequence(results: unknown[][]) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const current = results[callIndex] ?? [];
    callIndex++;

    const resolved = Promise.resolve(current);
    const chain: Record<string, unknown> = {
      then: resolved.then.bind(resolved),
      catch: resolved.catch.bind(resolved),
    };
    for (const method of ["where", "innerJoin", "leftJoin", "orderBy"]) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    const from = vi.fn().mockReturnValue(chain);
    return { from } as never;
  });
}

// ============================================================================
// getPlanningData
// ============================================================================

describe("getPlanningData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("groups contracts and events by vehicle", async () => {
    // selects: 1 vehicles, 2 contracts, 3 maintenance, 4 events
    mockSelectSequence([[VEHICLE_ROW], [CONTRACT_ROW], [], [EVENT_ROW]]);

    const result = await getPlanningData("2026-07-01", "2026-07-31");

    expect(result.success).toBe(true);
    if (result.success) {
      const vehicle = result.data.vehicles[0];
      expect(vehicle.contracts).toHaveLength(1);
      expect(vehicle.events).toHaveLength(1);
      expect(vehicle.events[0].eventNumber).toBe("EVT-2026-0001");
      expect(vehicle.events[0].fonctionColor).toBe("#D97706");
      expect(vehicle.events[0].clientName).toBe("Jean Dupont");
    }
  });

  it("returns an empty events array when none overlap", async () => {
    mockSelectSequence([[VEHICLE_ROW], [], [], []]);

    const result = await getPlanningData("2026-07-01", "2026-07-31");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles[0].events).toEqual([]);
      expect(result.data.vehicles[0].contracts).toEqual([]);
    }
  });

  it("rejects employee role (no contracts read permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(EMPLOYEE_USER);

    const result = await getPlanningData("2026-07-01", "2026-07-31");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getPlanningData("2026-07-01", "2026-07-31");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
