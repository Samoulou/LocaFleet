import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { approveContract } from "@/actions/approve-contract";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const CONTRACT_ID = "d0000000-0000-4000-8000-000000000001";
const CLIENT_ID = "c0000000-0000-4000-8000-000000000001";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const INVOICE_ID = "e0000000-0000-4000-8000-000000000001";

const ADMIN_USER = {
  id: "d0000000-0000-4000-8000-000000000099",
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
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

const VALID_INPUT = { contractId: CONTRACT_ID };

const DRAFT_CONTRACT = {
  id: CONTRACT_ID,
  tenantId: TENANT_ID,
  clientId: CLIENT_ID,
  vehicleId: VEHICLE_ID,
  status: "draft",
  startDate: new Date("2026-04-01"),
  endDate: new Date("2026-04-04"),
  dailyRate: "85.00",
  totalDays: 3,
  baseAmount: "255.00",
  optionsAmount: "0",
  totalAmount: "255.00",
  paymentMethod: "card",
};

const UNTRUSTED_CLIENT = { id: CLIENT_ID, isTrusted: false };
const TRUSTED_CLIENT = { id: CLIENT_ID, isTrusted: true };

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
    const innerJoin = vi
      .fn()
      .mockReturnValue({ where, leftJoin: vi.fn().mockReturnValue({ where }) });
    const from = vi.fn().mockReturnValue({ where, innerJoin });
    return { from } as never;
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

function mockExecuteChain(result?: Record<string, unknown>[]) {
  vi.mocked(db.execute).mockResolvedValue((result ?? []) as never);
}

// ============================================================================
// Tests
// ============================================================================

describe("approveContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockInsertChain();
    mockUpdateChain();
    mockExecuteChain();
  });

  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("approves draft contract — untrusted client → status = approved", async () => {
    mockSelectChainSequence([
      [DRAFT_CONTRACT], // contract fetch
      [], // overlap check
      [], // existing invoice check
      [UNTRUSTED_CLIENT], // client fetch
      [], // contract options
    ]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contractId).toBe(CONTRACT_ID);
      expect(result.data.invoiceId).toBe(INVOICE_ID);
      expect(result.data.invoiceNumber).toMatch(/^FAC-\d{4}-\d{4}$/);
    }
  });

  it("approves draft contract — trusted client → status = pending_cg", async () => {
    mockSelectChainSequence([[DRAFT_CONTRACT], [], [], [TRUSTED_CLIENT], []]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceId).toBe(INVOICE_ID);
    }
    // Verify update was called (contract status + vehicle status)
    expect(db.update).toHaveBeenCalled();
  });

  it("cash_departure → invoice paid + payment record created", async () => {
    const cashContract = { ...DRAFT_CONTRACT, paymentMethod: "cash_departure" };
    mockSelectChainSequence([[cashContract], [], [], [UNTRUSTED_CLIENT], []]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(true);
    // insert called for: invoice, payment, audit log
    expect(db.insert).toHaveBeenCalled();
  });

  it("non-cash payment → invoice pending, no payment record", async () => {
    const invoiceContract = { ...DRAFT_CONTRACT, paymentMethod: "invoice" };
    mockSelectChainSequence([
      [invoiceContract],
      [],
      [],
      [UNTRUSTED_CLIENT],
      [],
    ]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(true);
    // insert called for: invoice + audit log (no payment)
    expect(db.insert).toHaveBeenCalled();
  });

  it("includes options in invoice line items", async () => {
    const contractWithOptions = {
      ...DRAFT_CONTRACT,
      optionsAmount: "30.00",
      totalAmount: "285.00",
    };
    mockSelectChainSequence([
      [contractWithOptions],
      [],
      [],
      [UNTRUSTED_CLIENT],
      [{ name: "GPS", dailyPrice: "10.00", quantity: 1, totalPrice: "30.00" }],
    ]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(db.insert).toHaveBeenCalled();
  });

  it("generates FAC-YYYY-NNNN invoice number", async () => {
    mockSelectChainSequence([[DRAFT_CONTRACT], [], [], [UNTRUSTED_CLIENT], []]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      const year = new Date().getFullYear();
      expect(result.data.invoiceNumber).toBe(`FAC-${year}-0001`);
    }
  });

  // --------------------------------------------------------------------------
  // Business logic errors
  // --------------------------------------------------------------------------

  it("rejects if contract not in draft status", async () => {
    const approvedContract = { ...DRAFT_CONTRACT, status: "approved" };
    mockSelectChainSequence([[approvedContract]]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("brouillon");
    }
  });

  it("rejects if contract not found", async () => {
    mockSelectChainSequence([[]]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce contrat n'existe pas");
    }
  });

  it("rejects if contract belongs to other tenant", async () => {
    // Contract not found because tenantId mismatch in WHERE clause
    mockSelectChainSequence([[]]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce contrat n'existe pas");
    }
  });

  it("rejects if vehicle has overlapping active contract", async () => {
    mockSelectChainSequence([
      [DRAFT_CONTRACT],
      [{ id: "overlapping-contract" }], // overlap found
    ]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("déjà un contrat actif");
    }
  });

  it("rejects if invoice already exists for contract", async () => {
    mockSelectChainSequence([
      [DRAFT_CONTRACT],
      [], // no overlap
      [{ id: "existing-invoice" }], // duplicate invoice
    ]);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("facture existe déjà");
    }
  });

  // --------------------------------------------------------------------------
  // Auth checks
  // --------------------------------------------------------------------------

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer role", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  // --------------------------------------------------------------------------
  // Validation errors
  // --------------------------------------------------------------------------

  it("rejects invalid contractId (not UUID)", async () => {
    const result = await approveContract({ contractId: "bad-id" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  it("rejects missing contractId", async () => {
    const result = await approveContract({});

    expect(result.success).toBe(false);
  });

  // --------------------------------------------------------------------------
  // DB error handling
  // --------------------------------------------------------------------------

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await approveContract(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
