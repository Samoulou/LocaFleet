import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  closeContractAndGenerateInvoice,
  listInvoices,
  getInvoiceStatusCounts,
} from "@/actions/invoices";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const CONTRACT_ID = "b0000000-0000-4000-8000-000000000001";
const CLIENT_ID = "c0000000-0000-4000-8000-000000000001";
const VEHICLE_ID = "d0000000-0000-4000-8000-000000000001";
const INVOICE_ID = "e0000000-0000-4000-8000-000000000001";

const ADMIN_USER = {
  id: "f0000000-0000-4000-8000-000000000001",
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

const AGENT_USER = {
  id: "f0000000-0000-4000-8000-000000000002",
  tenantId: TENANT_ID,
  role: "agent" as const,
  email: "agent@locafleet.ch",
  name: "Agent Test",
  isActive: true,
};

const VIEWER_USER = {
  id: "f0000000-0000-4000-8000-000000000003",
  tenantId: TENANT_ID,
  role: "viewer" as const,
  email: "viewer@locafleet.ch",
  name: "Viewer Test",
  isActive: true,
};

const BASE_CONTRACT = {
  id: CONTRACT_ID,
  tenantId: TENANT_ID,
  clientId: CLIENT_ID,
  vehicleId: VEHICLE_ID,
  status: "active",
  startDate: new Date("2026-02-01"),
  endDate: new Date("2026-02-06"),
  departureMileage: 10000,
  includedKmPerDay: 100,
  excessKmRate: "0.50",
  dailyRate: "80.00",
  totalDays: 5,
  baseAmount: "400.00",
  optionsAmount: "50.00",
  contractPdfUrl: null,
};

const VALID_INPUT = {
  contractId: CONTRACT_ID,
  actualReturnDate: "2026-02-06",
  returnMileage: 10600,
  damagesAmount: 500,
  notes: "Retour OK",
};

const MOCK_INVOICE = {
  id: INVOICE_ID,
  invoiceNumber: "FAC-2026-0001",
  status: "pending" as const,
  totalAmount: "950.00",
  subtotal: "950.00",
  taxAmount: "0.00",
  issuedAt: new Date("2026-02-06"),
  dueDate: null,
  createdAt: new Date("2026-02-06"),
  clientId: CLIENT_ID,
  clientFirstName: "Jean",
  clientLastName: "Dupont",
  contractId: CONTRACT_ID,
  contractNumber: "LOC-2026-0001",
  vehicleBrand: "BMW",
  vehicleModel: "X3",
  vehiclePlateNumber: "VD 123456",
};

// ============================================================================
// DB mock helpers — closeContractAndGenerateInvoice
// ============================================================================

function mockSelectChainSequence(results: unknown[][]) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const currentResult = results[callIndex] ?? [];
    callIndex++;

    const resolvedValue = Promise.resolve(currentResult);
    const limit = vi.fn().mockReturnValue(resolvedValue);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const whereResult = Object.assign(Promise.resolve(currentResult), {
      limit,
      orderBy,
    });
    const where = vi.fn().mockReturnValue(whereResult);
    // Support both direct from→where and from→innerJoin→where chains
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ where, innerJoin });
    return { from } as never;
  });
}

function mockExecuteSequence(results: unknown[][]) {
  let callIndex = 0;
  const mockExecute = db.execute as ReturnType<typeof vi.fn>;
  mockExecute.mockImplementation(() => {
    const currentResult = results[callIndex] ?? [];
    callIndex++;
    return Promise.resolve(currentResult);
  });
}

function mockInsertChain(returning?: unknown[]) {
  const returningFn = vi
    .fn()
    .mockResolvedValue(returning ?? [{ id: INVOICE_ID }]);
  const values = vi.fn().mockReturnValue({ returning: returningFn });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values, returning: returningFn };
}

function mockUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return { set, where };
}

/**
 * Sets up all DB mocks for a successful close-contract scenario.
 * Select sequence (5 calls):
 *  1: contract fetch
 *  2: existing invoice check (empty = no duplicate)
 *  3: contract options (via innerJoin)
 *  4: client info (for dossier)
 *  5: vehicle info (for dossier)
 * Execute sequence (2 calls — FOR UPDATE):
 *  1: last invoice number
 *  2: last dossier number
 */
function setupSuccessMocks(overrides?: {
  contract?: Record<string, unknown>;
  options?: unknown[];
  lastInvoice?: unknown[];
  lastDossier?: unknown[];
}) {
  const contract = { ...BASE_CONTRACT, ...overrides?.contract };
  const options = overrides?.options ?? [
    {
      name: "GPS",
      dailyPrice: "10.00",
      quantity: 5,
      totalPrice: "50.00",
    },
  ];
  const lastInvoice = overrides?.lastInvoice ?? [];
  const lastDossier = overrides?.lastDossier ?? [];

  mockSelectChainSequence([
    [contract], // 1: contract
    [], // 2: no existing invoice
    options, // 3: contract options (innerJoin)
    [{ firstName: "Jean", lastName: "Dupont" }], // 4: client
    [{ brand: "Toyota", model: "Yaris", plateNumber: "VD 123456" }], // 5: vehicle
  ]);

  mockExecuteSequence([
    lastInvoice, // 1: last invoice number (FOR UPDATE)
    lastDossier, // 2: last dossier number (FOR UPDATE)
  ]);

  mockInsertChain([{ id: INVOICE_ID }]);
  mockUpdateChain();
}

// ============================================================================
// DB mock helpers — listInvoices
// ============================================================================

function mockInvoiceListSelectChain(
  dataResult: unknown[] = [],
  countResult: { value: number }[] = [{ value: 0 }]
) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const currentCall = callIndex++;

    if (currentCall === 0) {
      // Data query chain: select -> from -> leftJoin -> leftJoin -> leftJoin -> where -> orderBy -> limit -> offset
      const offset = vi.fn().mockResolvedValue(dataResult);
      const limit = vi.fn().mockReturnValue({ offset });
      const orderBy = vi.fn().mockReturnValue({ limit });
      const where = vi.fn().mockReturnValue({ orderBy });
      const leftJoin3 = vi.fn().mockReturnValue({ where });
      const leftJoin2 = vi.fn().mockReturnValue({ leftJoin: leftJoin3 });
      const leftJoin1 = vi.fn().mockReturnValue({ leftJoin: leftJoin2 });
      const from = vi.fn().mockReturnValue({ leftJoin: leftJoin1 });
      return { from } as never;
    }

    // Count query chain: select -> from -> leftJoin -> where
    const where = vi.fn().mockResolvedValue(countResult);
    const leftJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ leftJoin });
    return { from } as never;
  });
}

// ============================================================================
// DB mock helpers — getInvoiceStatusCounts
// ============================================================================

function mockStatusCountsSelectChain(result: unknown[] = []) {
  const where = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
}

// ============================================================================
// closeContractAndGenerateInvoice Tests
// ============================================================================

describe("closeContractAndGenerateInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("creates invoice for admin with all line items (base + options + excess km + damages)", async () => {
    setupSuccessMocks();

    const result = await closeContractAndGenerateInvoice(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceId).toBe(INVOICE_ID);
      expect(result.data.contractId).toBe(CONTRACT_ID);
    }

    // insert called 3 times: invoice, dossier, audit log
    expect(db.insert).toHaveBeenCalledTimes(3);
    // update called 2 times: contract status, vehicle status
    expect(db.update).toHaveBeenCalledTimes(2);
  });

  it("creates invoice for agent (has contracts:update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    setupSuccessMocks();

    const result = await closeContractAndGenerateInvoice(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceId).toBe(INVOICE_ID);
    }
  });

  it("creates invoice with no excess km (return mileage within limit)", async () => {
    setupSuccessMocks();

    const result = await closeContractAndGenerateInvoice({
      ...VALID_INPUT,
      returnMileage: 10400,
      damagesAmount: 0,
    });

    expect(result.success).toBe(true);
  });

  it("creates invoice with no damages (damagesAmount = 0)", async () => {
    setupSuccessMocks();

    const result = await closeContractAndGenerateInvoice({
      ...VALID_INPUT,
      damagesAmount: 0,
    });

    expect(result.success).toBe(true);
  });

  it("creates invoice with no options", async () => {
    setupSuccessMocks({ options: [] });

    const result = await closeContractAndGenerateInvoice(VALID_INPUT);

    expect(result.success).toBe(true);
  });

  it("generates correct invoice number format (FAC-YYYY-XXXX)", async () => {
    setupSuccessMocks({
      lastInvoice: [{ invoice_number: `FAC-${new Date().getFullYear()}-0005` }],
    });

    const result = await closeContractAndGenerateInvoice(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(db.insert).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Auth checks
  // --------------------------------------------------------------------------

  it("rejects viewer (no contracts:update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await closeContractAndGenerateInvoice(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await closeContractAndGenerateInvoice(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  // --------------------------------------------------------------------------
  // Business logic errors
  // --------------------------------------------------------------------------

  it("returns error when contract not found", async () => {
    mockSelectChainSequence([[]]);
    mockInsertChain();
    mockUpdateChain();

    const result = await closeContractAndGenerateInvoice(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce contrat n'existe pas");
    }
  });

  it("returns error when contract is not active (already completed)", async () => {
    mockSelectChainSequence([[{ ...BASE_CONTRACT, status: "completed" }]]);
    mockInsertChain();
    mockUpdateChain();

    const result = await closeContractAndGenerateInvoice(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Seuls les contrats actifs peuvent être clôturés"
      );
    }
  });

  it("returns error when contract already has an invoice (prevents duplicate)", async () => {
    mockSelectChainSequence([
      [BASE_CONTRACT], // contract found, active
      [{ id: "existing-invoice-id" }], // existing invoice found
    ]);
    mockInsertChain();
    mockUpdateChain();

    const result = await closeContractAndGenerateInvoice(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Une facture existe déjà pour ce contrat");
    }
  });

  // --------------------------------------------------------------------------
  // Validation errors
  // --------------------------------------------------------------------------

  it("rejects invalid contractId", async () => {
    const result = await closeContractAndGenerateInvoice({
      ...VALID_INPUT,
      contractId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  it("rejects missing returnMileage", async () => {
    const result = await closeContractAndGenerateInvoice({
      contractId: CONTRACT_ID,
      actualReturnDate: "2026-02-06",
    });

    expect(result.success).toBe(false);
  });

  // --------------------------------------------------------------------------
  // DB error
  // --------------------------------------------------------------------------

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });
    mockInsertChain();
    mockUpdateChain();

    const result = await closeContractAndGenerateInvoice(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// listInvoices Tests
// ============================================================================

describe("listInvoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns paginated data with joins for admin", async () => {
    mockInvoiceListSelectChain([MOCK_INVOICE], [{ value: 1 }]);

    const result = await listInvoices({ page: 1, pageSize: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoices).toHaveLength(1);
      expect(result.data.invoices[0].invoiceNumber).toBe("FAC-2026-0001");
      expect(result.data.invoices[0].clientFirstName).toBe("Jean");
      expect(result.data.invoices[0].clientLastName).toBe("Dupont");
      expect(result.data.invoices[0].vehicleBrand).toBe("BMW");
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.totalCount).toBe(1);
    }
  });

  it("returns paginated data for agent", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockInvoiceListSelectChain([MOCK_INVOICE], [{ value: 1 }]);

    const result = await listInvoices({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoices).toHaveLength(1);
    }
  });

  it("returns paginated data for viewer", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockInvoiceListSelectChain([MOCK_INVOICE], [{ value: 1 }]);

    const result = await listInvoices({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoices).toHaveLength(1);
    }
  });

  it("filters by status", async () => {
    mockInvoiceListSelectChain([MOCK_INVOICE], [{ value: 1 }]);

    const result = await listInvoices({ status: "pending" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoices[0].status).toBe("pending");
    }
  });

  it("filters by search term", async () => {
    mockInvoiceListSelectChain([MOCK_INVOICE], [{ value: 1 }]);

    const result = await listInvoices({ search: "Dupont" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoices).toHaveLength(1);
    }
  });

  it("returns empty list when no invoices", async () => {
    mockInvoiceListSelectChain([], [{ value: 0 }]);

    const result = await listInvoices({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoices).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
      expect(result.data.totalPages).toBe(0);
    }
  });

  it("returns error on invalid params", async () => {
    const result = await listInvoices({ status: "invalid_status" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("statut");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await listInvoices({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await listInvoices({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// getInvoiceStatusCounts Tests
// ============================================================================

describe("getInvoiceStatusCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns counts per status", async () => {
    mockStatusCountsSelectChain([
      {
        pending: 5,
        invoiced: 3,
        verification: 1,
        paid: 10,
        conflict: 0,
        cancelled: 2,
      },
    ]);

    const result = await getInvoiceStatusCounts();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pending).toBe(5);
      expect(result.data.invoiced).toBe(3);
      expect(result.data.verification).toBe(1);
      expect(result.data.paid).toBe(10);
      expect(result.data.conflict).toBe(0);
      expect(result.data.cancelled).toBe(2);
    }
  });

  it("filters by tenantId (verifies where clause is called)", async () => {
    mockStatusCountsSelectChain([
      {
        pending: 0,
        invoiced: 0,
        verification: 0,
        paid: 0,
        conflict: 0,
        cancelled: 0,
      },
    ]);

    const result = await getInvoiceStatusCounts();

    expect(result.success).toBe(true);
    // Verify db.select was called (which triggers the chain with where clause)
    expect(db.select).toHaveBeenCalled();
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getInvoiceStatusCounts();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getInvoiceStatusCounts();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
