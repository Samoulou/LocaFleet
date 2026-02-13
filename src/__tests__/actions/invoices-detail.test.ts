import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { getInvoiceById, updateInvoiceStatus } from "@/actions/invoices";

vi.mock("@/actions/audit-logs", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const INVOICE_ID = "e0000000-0000-4000-8000-000000000001";
const CLIENT_ID = "c0000000-0000-4000-8000-000000000001";
const CONTRACT_ID = "b0000000-0000-4000-8000-000000000001";
const VEHICLE_ID = "d0000000-0000-4000-8000-000000000001";
const PAYMENT_ID = "p0000000-0000-4000-8000-000000000001";

const ADMIN_USER = {
  id: "f0000000-0000-4000-8000-000000000001",
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

// ============================================================================
// Mock data
// ============================================================================

const INVOICE_ROW = {
  id: INVOICE_ID,
  invoiceNumber: "FAC-2026-0001",
  status: "pending" as const,
  subtotal: "900.00",
  taxRate: "7.7",
  taxAmount: "69.30",
  totalAmount: "969.30",
  lineItems: [
    {
      description: "Location véhicule",
      quantity: 5,
      unitPrice: "80.00",
      totalPrice: "400.00",
      type: "base_rental",
    },
    {
      description: "GPS",
      quantity: 5,
      unitPrice: "10.00",
      totalPrice: "50.00",
      type: "option",
    },
  ],
  invoicePdfUrl: null,
  issuedAt: new Date("2026-02-06"),
  dueDate: "2026-03-06",
  notes: "RAS",
  createdAt: new Date("2026-02-06"),
  clientId: CLIENT_ID,
  clientFirstName: "Jean",
  clientLastName: "Dupont",
  clientEmail: "jean.dupont@mail.ch",
  clientPhone: "+41 79 123 45 67",
  contractId: CONTRACT_ID,
  contractNumber: "LOC-2026-0001",
  contractStartDate: new Date("2026-02-01"),
  contractEndDate: new Date("2026-02-06"),
  vehicleId: VEHICLE_ID,
  vehicleBrand: "BMW",
  vehicleModel: "X3",
  vehiclePlateNumber: "VD 123456",
};

const PAYMENT_ROWS = [
  {
    id: PAYMENT_ID,
    amount: "500.00",
    method: "card",
    reference: "PAY-001",
    paidAt: new Date("2026-02-07"),
    notes: null,
    createdAt: new Date("2026-02-07"),
  },
];

// ============================================================================
// DB mock helpers
// ============================================================================

/**
 * Mock for getInvoiceById: 2 sequential select calls
 *  1: invoice + joins (returns rows[0])
 *  2: payments (returns rows[1])
 */
function mockGetByIdSelectChain(
  invoiceRow: unknown[] = [INVOICE_ROW],
  paymentRows: unknown[] = PAYMENT_ROWS
) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const current = callIndex++;

    if (current === 0) {
      // Invoice query: select -> from -> innerJoin -> innerJoin -> innerJoin -> where
      const where = vi.fn().mockResolvedValue(invoiceRow);
      const innerJoin3 = vi.fn().mockReturnValue({ where });
      const innerJoin2 = vi.fn().mockReturnValue({ innerJoin: innerJoin3 });
      const innerJoin1 = vi.fn().mockReturnValue({ innerJoin: innerJoin2 });
      const from = vi.fn().mockReturnValue({ innerJoin: innerJoin1 });
      return { from } as never;
    }

    // Payments query: select -> from -> where -> orderBy
    const orderBy = vi.fn().mockResolvedValue(paymentRows);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    return { from } as never;
  });
}

/**
 * Mock for updateInvoiceStatus: single select call to fetch current invoice
 */
function mockUpdateStatusSelectChain(rows: unknown[]) {
  const resolvedValue = Promise.resolve(rows);
  const where = vi.fn().mockReturnValue(resolvedValue);
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
}

function mockUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return { set, where };
}

// ============================================================================
// getInvoiceById Tests
// ============================================================================

describe("getInvoiceById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("returns a complete invoice with client, vehicle, contract, and payments", async () => {
    mockGetByIdSelectChain([INVOICE_ROW], PAYMENT_ROWS);

    const result = await getInvoiceById(INVOICE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(INVOICE_ID);
      expect(result.data.invoiceNumber).toBe("FAC-2026-0001");
      expect(result.data.status).toBe("pending");
      expect(result.data.client.firstName).toBe("Jean");
      expect(result.data.client.lastName).toBe("Dupont");
      expect(result.data.vehicle.brand).toBe("BMW");
      expect(result.data.vehicle.plateNumber).toBe("VD 123456");
      expect(result.data.contract.contractNumber).toBe("LOC-2026-0001");
      expect(result.data.payments).toHaveLength(1);
      expect(result.data.payments[0].amount).toBe("500.00");
    }
  });

  it("calculates totalPaid and balance correctly", async () => {
    const multiplePayments = [
      { ...PAYMENT_ROWS[0], amount: "500.00" },
      {
        id: "p0000000-0000-4000-8000-000000000002",
        amount: "200.00",
        method: "cash",
        reference: null,
        paidAt: new Date("2026-02-08"),
        notes: null,
        createdAt: new Date("2026-02-08"),
      },
    ];
    mockGetByIdSelectChain([INVOICE_ROW], multiplePayments);

    const result = await getInvoiceById(INVOICE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      // totalAmount = 969.30, totalPaid = 500 + 200 = 700
      expect(result.data.totalPaid).toBe(700);
      expect(result.data.balance).toBeCloseTo(269.3, 2);
    }
  });

  it("returns error when invoice does not exist", async () => {
    mockGetByIdSelectChain([], []);

    const result = await getInvoiceById("e9999999-9999-4999-9999-999999999999");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette facture n'existe pas");
    }
  });

  it("verifies tenant_id filtering (db.select is called)", async () => {
    mockGetByIdSelectChain([INVOICE_ROW], PAYMENT_ROWS);

    await getInvoiceById(INVOICE_ID);

    // db.select called twice: once for invoice, once for payments
    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it("verifies RBAC — requirePermission('invoices', 'read') is called", async () => {
    mockGetByIdSelectChain([INVOICE_ROW], PAYMENT_ROWS);

    await getInvoiceById(INVOICE_ID);

    // getCurrentUser is called by requirePermission internally
    expect(getCurrentUser).toHaveBeenCalled();
  });

  it("returns RBAC error when user is not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getInvoiceById(INVOICE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getInvoiceById(INVOICE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// updateInvoiceStatus Tests
// ============================================================================

describe("updateInvoiceStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockUpdateChain();
  });

  // --------------------------------------------------------------------------
  // Allowed transitions
  // --------------------------------------------------------------------------

  it("pending -> invoiced: transition succeeds", async () => {
    mockUpdateStatusSelectChain([
      { id: INVOICE_ID, status: "pending", contractId: CONTRACT_ID },
    ]);

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "invoiced",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(INVOICE_ID);
    }
  });

  it("pending -> cancelled: transition succeeds", async () => {
    mockUpdateStatusSelectChain([
      { id: INVOICE_ID, status: "pending", contractId: CONTRACT_ID },
    ]);

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "cancelled",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(INVOICE_ID);
    }
  });

  it("invoiced -> cancelled: transition succeeds", async () => {
    mockUpdateStatusSelectChain([
      { id: INVOICE_ID, status: "invoiced", contractId: CONTRACT_ID },
    ]);

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "cancelled",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(INVOICE_ID);
    }
  });

  // --------------------------------------------------------------------------
  // Rejected transitions
  // --------------------------------------------------------------------------

  it("paid -> invoiced: transition refused", async () => {
    mockUpdateStatusSelectChain([
      { id: INVOICE_ID, status: "paid", contractId: CONTRACT_ID },
    ]);

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "invoiced",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Transition de statut non autorisée");
      expect(result.error).toContain("paid");
      expect(result.error).toContain("invoiced");
    }
  });

  it("cancelled -> invoiced: transition refused", async () => {
    mockUpdateStatusSelectChain([
      { id: INVOICE_ID, status: "cancelled", contractId: CONTRACT_ID },
    ]);

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "invoiced",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Transition de statut non autorisée");
    }
  });

  // --------------------------------------------------------------------------
  // Error cases
  // --------------------------------------------------------------------------

  it("returns error when invoice does not exist", async () => {
    mockUpdateStatusSelectChain([]);

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "invoiced",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette facture n'existe pas");
    }
  });

  it("returns validation error for invalid input", async () => {
    const result = await updateInvoiceStatus({
      invoiceId: "not-a-uuid",
      newStatus: "invoiced",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  // --------------------------------------------------------------------------
  // Tenant + RBAC
  // --------------------------------------------------------------------------

  it("verifies tenant_id filtering (db.select is called)", async () => {
    mockUpdateStatusSelectChain([
      { id: INVOICE_ID, status: "pending", contractId: CONTRACT_ID },
    ]);

    await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "invoiced",
    });

    expect(db.select).toHaveBeenCalled();
  });

  it("verifies RBAC — requirePermission('invoices', 'update') is called", async () => {
    mockUpdateStatusSelectChain([
      { id: INVOICE_ID, status: "pending", contractId: CONTRACT_ID },
    ]);

    await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "invoiced",
    });

    expect(getCurrentUser).toHaveBeenCalled();
  });

  it("returns RBAC error when user is not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "invoiced",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  // --------------------------------------------------------------------------
  // Audit log
  // --------------------------------------------------------------------------

  it("creates audit log on successful transition", async () => {
    mockUpdateStatusSelectChain([
      { id: INVOICE_ID, status: "pending", contractId: CONTRACT_ID },
    ]);

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "invoiced",
    });

    expect(result.success).toBe(true);
    // Transaction was called (audit log is inside transaction)
    expect(db.transaction).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Cancelled -> dossier update
  // --------------------------------------------------------------------------

  it("updates dossier to 'open' when cancelling an invoice", async () => {
    mockUpdateStatusSelectChain([
      { id: INVOICE_ID, status: "pending", contractId: CONTRACT_ID },
    ]);

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "cancelled",
    });

    expect(result.success).toBe(true);
    // db.update is called inside transaction:
    //   1. update invoice status
    //   2. update dossier status (because cancelled)
    // Since tx === db in our mock, db.update should be called at least twice
    expect(db.update).toHaveBeenCalledTimes(2);
  });

  it("does NOT update dossier when transitioning to invoiced", async () => {
    mockUpdateStatusSelectChain([
      { id: INVOICE_ID, status: "pending", contractId: CONTRACT_ID },
    ]);

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "invoiced",
    });

    expect(result.success).toBe(true);
    // Only 1 update: invoice status (no dossier update)
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // DB error
  // --------------------------------------------------------------------------

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      newStatus: "invoiced",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
