import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { processPayment } from "@/actions/payments";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const INVOICE_ID = "b0000000-0000-4000-8000-000000000001";
const CONTRACT_ID = "c0000000-0000-4000-8000-000000000001";
const PAYMENT_ID = "d0000000-0000-4000-8000-000000000099";

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
  invoiceId: INVOICE_ID,
  amount: 1250.5,
  method: "bank_transfer",
  paidAt: "2026-02-10",
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
    const whereResult = Object.assign(Promise.resolve(currentResult), {
      limit,
    });
    const where = vi.fn().mockReturnValue(whereResult);
    const from = vi.fn().mockReturnValue({ where });
    return { from } as never;
  });
}

function mockInsertChain(returning?: unknown[]) {
  const returningFn = vi
    .fn()
    .mockResolvedValue(returning ?? [{ id: PAYMENT_ID }]);
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

// ============================================================================
// Tests
// ============================================================================

describe("processPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockUpdateChain();
    mockInsertChain();
  });

  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("creates payment for admin — success with id", async () => {
    mockSelectChainSequence([
      [{ id: INVOICE_ID, status: "invoiced", contractId: CONTRACT_ID }],
    ]);

    const result = await processPayment(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(PAYMENT_ID);
    }
  });

  // --------------------------------------------------------------------------
  // Auth checks
  // --------------------------------------------------------------------------

  it("rejects agent (no payments:create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);

    const result = await processPayment(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects viewer", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await processPayment(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await processPayment(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  // --------------------------------------------------------------------------
  // Validation errors
  // --------------------------------------------------------------------------

  it("rejects invalid input (bad UUID)", async () => {
    const result = await processPayment({
      ...VALID_INPUT,
      invoiceId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  // --------------------------------------------------------------------------
  // Invoice not found
  // --------------------------------------------------------------------------

  it("rejects invoice not found", async () => {
    mockSelectChainSequence([[]]);

    const result = await processPayment(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette facture n'existe pas");
    }
  });

  // --------------------------------------------------------------------------
  // Invoice status checks
  // --------------------------------------------------------------------------

  it("rejects invoice with status 'paid' (already paid)", async () => {
    mockSelectChainSequence([
      [{ id: INVOICE_ID, status: "paid", contractId: CONTRACT_ID }],
    ]);

    const result = await processPayment(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette facture est déjà payée");
    }
  });

  it("rejects invoice with status 'cancelled'", async () => {
    mockSelectChainSequence([
      [{ id: INVOICE_ID, status: "cancelled", contractId: CONTRACT_ID }],
    ]);

    const result = await processPayment(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette facture ne peut pas être quittancée");
    }
  });

  // --------------------------------------------------------------------------
  // Transaction operations
  // --------------------------------------------------------------------------

  it("updates invoice status to paid", async () => {
    mockSelectChainSequence([
      [{ id: INVOICE_ID, status: "pending", contractId: CONTRACT_ID }],
    ]);

    const result = await processPayment(VALID_INPUT);

    expect(result.success).toBe(true);
    // Transaction calls: insert (payment) + insert (audit) + update (invoice) + update (dossier)
    expect(db.insert).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });

  it("updates dossier status to paid", async () => {
    mockSelectChainSequence([
      [{ id: INVOICE_ID, status: "invoiced", contractId: CONTRACT_ID }],
    ]);

    const result = await processPayment(VALID_INPUT);

    expect(result.success).toBe(true);
    // update is called for both invoice and dossier
    expect(db.update).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // DB error
  // --------------------------------------------------------------------------

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await processPayment(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
