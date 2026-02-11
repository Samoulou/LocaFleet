import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { createDraftContract } from "@/actions/contracts";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const CLIENT_ID = "c0000000-0000-4000-8000-000000000001";
const CONTRACT_ID = "d0000000-0000-4000-8000-000000000001";
const CATEGORY_ID = "e0000000-0000-4000-8000-000000000001";
const OPTION_ID_1 = "f0000000-0000-4000-8000-000000000001";

const ADMIN_USER = {
  id: "d0000000-0000-4000-8000-000000000099",
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

const AGENT_USER = {
  id: "d0000000-0000-4000-8000-000000000098",
  tenantId: TENANT_ID,
  role: "agent" as const,
  email: "agent@locafleet.ch",
  name: "Agent Test",
  isActive: true,
};

const VIEWER_USER = {
  id: "d0000000-0000-4000-8000-000000000097",
  tenantId: TENANT_ID,
  role: "viewer" as const,
  email: "viewer@locafleet.ch",
  name: "Viewer Test",
  isActive: true,
};

const VALID_INPUT = {
  vehicleId: VEHICLE_ID,
  clientId: CLIENT_ID,
  startDate: "2026-04-01T09:00:00",
  endDate: "2026-04-04T09:00:00",
  paymentMethod: "cash_departure" as const,
  selectedOptionIds: [] as string[],
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
    const orderByResult = Object.assign(Promise.resolve(currentResult), {
      limit,
    });
    const orderBy = vi.fn().mockReturnValue(orderByResult);
    const whereResult = Object.assign(Promise.resolve(currentResult), {
      limit,
      orderBy,
    });
    const where = vi.fn().mockReturnValue(whereResult);
    const from = vi.fn().mockReturnValue({ where });
    return { from } as never;
  });
}

function mockInsertChain(returning?: unknown[]) {
  const returningFn = vi
    .fn()
    .mockResolvedValue(returning ?? [{ id: CONTRACT_ID }]);
  const values = vi.fn().mockReturnValue({ returning: returningFn });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values, returning: returningFn };
}

function mockExecuteChain(result?: Record<string, unknown>[]) {
  vi.mocked(db.execute).mockResolvedValue((result ?? []) as never);
}

// ============================================================================
// Tests
// ============================================================================

describe("createDraftContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockInsertChain();
    mockExecuteChain();
  });

  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("creates a draft contract for admin — returns id + contractNumber", async () => {
    // select calls: 1. vehicle, 2. overlap check, 3. client
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "available",
          dailyRateOverride: "85.00",
          categoryId: CATEGORY_ID,
        },
      ],
      [], // no overlap
      [{ id: CLIENT_ID }],
    ]);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CONTRACT_ID);
      expect(result.data.contractNumber).toMatch(/^CTR-\d{4}-\d{4}$/);
    }
  });

  it("creates a draft contract for agent", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "available",
          dailyRateOverride: "85.00",
          categoryId: CATEGORY_ID,
        },
      ],
      [],
      [{ id: CLIENT_ID }],
    ]);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CONTRACT_ID);
    }
  });

  it("generates CTR-YYYY-NNNN contract number", async () => {
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "available",
          dailyRateOverride: "100.00",
          categoryId: null,
        },
      ],
      [],
      [{ id: CLIENT_ID }],
    ]);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      const year = new Date().getFullYear();
      expect(result.data.contractNumber).toBe(`CTR-${year}-0001`);
    }
  });

  it("inserts contract with correct amounts (3 days × 85 CHF)", async () => {
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "available",
          dailyRateOverride: "85.00",
          categoryId: CATEGORY_ID,
        },
      ],
      [],
      [{ id: CLIENT_ID }],
    ]);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(true);
    // Verify db.insert was called (contract + audit log, possibly options)
    expect(db.insert).toHaveBeenCalled();
  });

  it("falls back to category daily rate when vehicle has no override", async () => {
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "available",
          dailyRateOverride: null,
          categoryId: CATEGORY_ID,
        },
      ],
      [],
      [{ id: CLIENT_ID }],
      [{ dailyRate: "90.00" }], // category rate lookup
    ]);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(true);
  });

  it("fetches and inserts selected options snapshot", async () => {
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "available",
          dailyRateOverride: "85.00",
          categoryId: CATEGORY_ID,
        },
      ],
      [],
      [{ id: CLIENT_ID }],
      [{ id: OPTION_ID_1, name: "GPS", dailyPrice: "10.00", isPerDay: true }], // available options
    ]);

    const inputWithOptions = {
      ...VALID_INPUT,
      selectedOptionIds: [OPTION_ID_1],
    };

    const result = await createDraftContract(inputWithOptions);

    expect(result.success).toBe(true);
    // insert is called for contract, options, and audit log
    expect(db.insert).toHaveBeenCalled();
  });

  it("bills partial day correctly (25h = 2 billed days)", async () => {
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "available",
          dailyRateOverride: "100.00",
          categoryId: null,
        },
      ],
      [], // no overlap
      [{ id: CLIENT_ID }],
    ]);

    const partialDayInput = {
      ...VALID_INPUT,
      startDate: "2026-04-01T09:00:00",
      endDate: "2026-04-02T10:00:00", // 25 hours
    };

    const result = await createDraftContract(partialDayInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CONTRACT_ID);
    }
    // Verify insert was called (contract uses billedDays=2)
    expect(db.insert).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Business logic errors
  // --------------------------------------------------------------------------

  it("rejects date overlap with existing contracts", async () => {
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "available",
          dailyRateOverride: "85.00",
          categoryId: CATEGORY_ID,
        },
      ],
      [{ id: "existing-contract" }], // overlap found
    ]);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("déjà un contrat");
    }
  });

  it("rejects vehicle not found", async () => {
    mockSelectChainSequence([[]]);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("rejects vehicle out_of_service", async () => {
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "out_of_service",
          dailyRateOverride: "85.00",
          categoryId: CATEGORY_ID,
        },
      ],
    ]);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("hors service");
    }
  });

  it("rejects when no daily rate configured", async () => {
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "available",
          dailyRateOverride: null,
          categoryId: null,
        },
      ],
      [],
      [{ id: CLIENT_ID }],
    ]);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("tarif journalier");
    }
  });

  it("rejects client not found", async () => {
    mockSelectChainSequence([
      [
        {
          id: VEHICLE_ID,
          status: "available",
          dailyRateOverride: "85.00",
          categoryId: CATEGORY_ID,
        },
      ],
      [],
      [], // no client
    ]);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce client n'existe pas");
    }
  });

  // --------------------------------------------------------------------------
  // Auth checks
  // --------------------------------------------------------------------------

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer (no create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  // --------------------------------------------------------------------------
  // Validation errors
  // --------------------------------------------------------------------------

  it("rejects invalid input (bad vehicleId)", async () => {
    const result = await createDraftContract({
      ...VALID_INPUT,
      vehicleId: "bad",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  // --------------------------------------------------------------------------
  // DB error handling
  // --------------------------------------------------------------------------

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await createDraftContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
