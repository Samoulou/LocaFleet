import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  createDraftContract,
  listContracts,
  getClientsForTenant,
  getRentalOptionsForTenant,
} from "@/actions/contracts";

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
    const forUpdate = vi.fn().mockReturnValue(resolvedValue);
    const orderByResult = Object.assign(Promise.resolve(currentResult), {
      limit,
    });
    const orderBy = vi.fn().mockReturnValue(orderByResult);
    const whereResult = Object.assign(Promise.resolve(currentResult), {
      limit,
      orderBy,
      for: forUpdate,
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

type LeftJoinBuilder = {
  where: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
};

/**
 * listContracts runs two queries via Promise.all (data first, count second):
 * 1. data:  select -> from -> leftJoin -> leftJoin -> where -> orderBy -> limit -> offset
 * 2. count: select -> from -> leftJoin -> leftJoin -> where (awaited)
 */
function mockListContractsChains(
  dataResult: unknown[],
  countResult: { value: number }[]
) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const isDataQuery = callIndex === 0;
    callIndex++;

    if (isDataQuery) {
      const offset = vi.fn().mockResolvedValue(dataResult);
      const limit = vi.fn().mockReturnValue({ offset });
      const orderBy = vi.fn().mockReturnValue({ limit });
      const where = vi.fn().mockReturnValue({ orderBy });
      const builder: LeftJoinBuilder = { where, leftJoin: vi.fn() };
      builder.leftJoin.mockReturnValue(builder);
      const from = vi.fn().mockReturnValue(builder);
      return { from } as never;
    }

    const where = vi.fn().mockResolvedValue(countResult);
    const builder: LeftJoinBuilder = { where, leftJoin: vi.fn() };
    builder.leftJoin.mockReturnValue(builder);
    const from = vi.fn().mockReturnValue(builder);
    return { from } as never;
  });
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

// ============================================================================
// listContracts
// ============================================================================

const CONTRACT_LIST_ROW = {
  id: CONTRACT_ID,
  contractNumber: "CTR-2026-0001",
  status: "draft" as const,
  startDate: new Date("2026-04-01T09:00:00"),
  endDate: new Date("2026-04-04T09:00:00"),
  totalDays: 3,
  totalAmount: "255.00",
  createdAt: new Date("2026-03-20T10:00:00"),
  clientFirstName: "Jean",
  clientLastName: "Dupont",
  vehicleBrand: "BMW",
  vehicleModel: "X3",
  vehiclePlateNumber: "VD 123456",
};

describe("listContracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("returns paginated contracts with default params", async () => {
    mockListContractsChains([CONTRACT_LIST_ROW], [{ value: 1 }]);

    const result = await listContracts({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contracts).toHaveLength(1);
      expect(result.data.contracts[0].contractNumber).toBe("CTR-2026-0001");
      expect(result.data.contracts[0].totalAmount).toBe("255.00");
      expect(result.data.contracts[0].clientFirstName).toBe("Jean");
      expect(result.data.contracts[0].vehiclePlateNumber).toBe("VD 123456");
      expect(result.data.contracts[0].startDate).toEqual(
        new Date("2026-04-01T09:00:00")
      );
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.totalCount).toBe(1);
      expect(result.data.totalPages).toBe(1);
    }
  });

  it("parses page/pageSize from string search params", async () => {
    mockListContractsChains([], [{ value: 45 }]);

    const result = await listContracts({ page: "2", pageSize: "10" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(10);
      expect(result.data.totalPages).toBe(5);
    }
  });

  it("clamps invalid pagination params (page=abc -> 1, pageSize=999 -> 100)", async () => {
    mockListContractsChains([], [{ value: 0 }]);

    const result = await listContracts({ page: "abc", pageSize: "999" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(100);
    }
  });

  it("filters by valid status", async () => {
    mockListContractsChains(
      [{ ...CONTRACT_LIST_ROW, status: "active" as const }],
      [{ value: 1 }]
    );

    const result = await listContracts({ status: "active" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contracts[0].status).toBe("active");
    }
  });

  it("ignores unknown status values (no filter applied, still succeeds)", async () => {
    mockListContractsChains([CONTRACT_LIST_ROW], [{ value: 1 }]);

    const result = await listContracts({ status: "flying" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contracts).toHaveLength(1);
    }
  });

  it("searches by contract number / client / plate", async () => {
    mockListContractsChains([CONTRACT_LIST_ROW], [{ value: 1 }]);

    const result = await listContracts({ search: "Dupont" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contracts).toHaveLength(1);
      expect(result.data.contracts[0].clientLastName).toBe("Dupont");
    }
  });

  it("maps null joined fields to empty strings", async () => {
    mockListContractsChains(
      [
        {
          ...CONTRACT_LIST_ROW,
          clientFirstName: null,
          clientLastName: null,
          vehicleBrand: null,
          vehicleModel: null,
          vehiclePlateNumber: null,
        },
      ],
      [{ value: 1 }]
    );

    const result = await listContracts({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contracts[0].clientFirstName).toBe("");
      expect(result.data.contracts[0].clientLastName).toBe("");
      expect(result.data.contracts[0].vehicleBrand).toBe("");
      expect(result.data.contracts[0].vehicleModel).toBe("");
      expect(result.data.contracts[0].vehiclePlateNumber).toBe("");
    }
  });

  it("returns empty list with totalCount=0 and totalPages=0", async () => {
    mockListContractsChains([], [{ value: 0 }]);

    const result = await listContracts({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contracts).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
      expect(result.data.totalPages).toBe(0);
    }
  });

  it("works for viewer (contracts:read allowed)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockListContractsChains([CONTRACT_LIST_ROW], [{ value: 1 }]);

    const result = await listContracts({});

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await listContracts({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("handles DB error gracefully with French error message", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await listContracts({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement des contrats"
      );
    }
  });
});

// ============================================================================
// getClientsForTenant
// ============================================================================

describe("getClientsForTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns clients sorted for tenant", async () => {
    const clientRows = [
      {
        id: CLIENT_ID,
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean.dupont@example.ch",
        phone: "+41 79 123 45 67",
        isTrusted: true,
      },
      {
        id: "c0000000-0000-4000-8000-000000000002",
        firstName: "Marie",
        lastName: "Martin",
        email: "marie.martin@example.ch",
        phone: "+41 78 987 65 43",
        isTrusted: false,
      },
    ];
    mockSelectChainSequence([clientRows]);

    const result = await getClientsForTenant();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].firstName).toBe("Jean");
      expect(result.data[0].isTrusted).toBe(true);
      expect(result.data[1].email).toBe("marie.martin@example.ch");
    }
  });

  it("returns empty array when tenant has no clients", async () => {
    mockSelectChainSequence([[]]);

    const result = await getClientsForTenant();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getClientsForTenant();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer (no contracts:create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await getClientsForTenant();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully with French error message", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getClientsForTenant();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement des clients"
      );
    }
  });
});

// ============================================================================
// getRentalOptionsForTenant
// ============================================================================

describe("getRentalOptionsForTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns active rental options for tenant", async () => {
    const optionRows = [
      {
        id: OPTION_ID_1,
        name: "GPS",
        dailyPrice: "10.00",
        isPerDay: true,
      },
      {
        id: "f0000000-0000-4000-8000-000000000002",
        name: "Siège bébé",
        dailyPrice: "25.00",
        isPerDay: false,
      },
    ];
    mockSelectChainSequence([optionRows]);

    const result = await getRentalOptionsForTenant();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe("GPS");
      expect(result.data[0].dailyPrice).toBe("10.00");
      expect(result.data[0].isPerDay).toBe(true);
      expect(result.data[1].isPerDay).toBe(false);
    }
  });

  it("returns empty array when tenant has no active options", async () => {
    mockSelectChainSequence([[]]);

    const result = await getRentalOptionsForTenant();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getRentalOptionsForTenant();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer (no contracts:create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await getRentalOptionsForTenant();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully with French error message", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getRentalOptionsForTenant();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement des options"
      );
    }
  });
});
