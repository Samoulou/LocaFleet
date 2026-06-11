import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { getContractById } from "@/actions/get-contract";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const CONTRACT_ID = "d0000000-0000-4000-8000-000000000001";
const CLIENT_ID = "c0000000-0000-4000-8000-000000000001";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const OPTION_ID = "f0000000-0000-4000-8000-000000000001";
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

const CONTRACT_ROW = {
  id: CONTRACT_ID,
  contractNumber: "CTR-2026-0001",
  status: "active" as const,
  startDate: new Date("2026-04-01T09:00:00"),
  endDate: new Date("2026-04-04T09:00:00"),
  dailyRate: "85.00",
  totalDays: 3,
  baseAmount: "255.00",
  optionsAmount: "30.00",
  totalAmount: "285.00",
  depositAmount: "500.00",
  depositStatus: "pending",
  paymentMethod: "card",
  pickupLocation: "Lausanne",
  returnLocation: "Genève",
  notes: "Client régulier",
  createdAt: new Date("2026-03-20T10:00:00"),
  archivedAt: null,
  actualReturnDate: null,
  clientId: CLIENT_ID,
  clientFirstName: "Jean",
  clientLastName: "Dupont",
  clientPhone: "+41 79 123 45 67",
  clientEmail: "jean.dupont@example.ch",
  clientIsTrusted: true,
  vehicleId: VEHICLE_ID,
  vehicleBrand: "BMW",
  vehicleModel: "X3",
  vehiclePlateNumber: "VD 123456",
  vehicleDailyRateOverride: "85.00",
  categoryName: "SUV",
};

const OPTION_ROW = {
  id: OPTION_ID,
  name: "GPS",
  dailyPrice: "10.00",
  quantity: 1,
  totalPrice: "30.00",
};

const INVOICE_ROW = {
  id: INVOICE_ID,
  invoiceNumber: "INV-2026-0001",
  status: "paid" as const,
  totalAmount: "285.00",
  issuedAt: new Date("2026-04-05T08:00:00"),
};

// ============================================================================
// DB mock helpers
// ============================================================================

type JoinableBuilder = {
  where: ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
};

/**
 * getContractById issues 3 select calls in order:
 * 1. contract: select -> from -> innerJoin -> innerJoin -> leftJoin -> where (awaited)
 * 2. options:  select -> from -> where (awaited)
 * 3. invoice:  select -> from -> where (awaited)
 */
function mockSelectChainSequence(results: unknown[][]) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const currentResult = results[callIndex] ?? [];
    callIndex++;

    const where = vi.fn().mockResolvedValue(currentResult);
    const builder: JoinableBuilder = {
      where,
      innerJoin: vi.fn(),
      leftJoin: vi.fn(),
    };
    builder.innerJoin.mockReturnValue(builder);
    builder.leftJoin.mockReturnValue(builder);
    const from = vi.fn().mockReturnValue(builder);
    return { from } as never;
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("getContractById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("returns full contract detail with client, vehicle, options and invoice", async () => {
    mockSelectChainSequence([[CONTRACT_ROW], [OPTION_ROW], [INVOICE_ROW]]);

    const result = await getContractById(CONTRACT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CONTRACT_ID);
      expect(result.data.contractNumber).toBe("CTR-2026-0001");
      expect(result.data.status).toBe("active");
      expect(result.data.dailyRate).toBe("85.00");
      expect(result.data.totalDays).toBe(3);
      expect(result.data.baseAmount).toBe("255.00");
      expect(result.data.optionsAmount).toBe("30.00");
      expect(result.data.totalAmount).toBe("285.00");
      expect(result.data.depositAmount).toBe("500.00");
      expect(result.data.startDate).toEqual(new Date("2026-04-01T09:00:00"));
      expect(result.data.endDate).toEqual(new Date("2026-04-04T09:00:00"));

      // Nested client mapping
      expect(result.data.client).toEqual({
        id: CLIENT_ID,
        firstName: "Jean",
        lastName: "Dupont",
        phone: "+41 79 123 45 67",
        email: "jean.dupont@example.ch",
        isTrusted: true,
      });

      // Nested vehicle mapping
      expect(result.data.vehicle).toEqual({
        id: VEHICLE_ID,
        brand: "BMW",
        model: "X3",
        plateNumber: "VD 123456",
        categoryName: "SUV",
        dailyRateOverride: "85.00",
      });

      // Options snapshot
      expect(result.data.options).toHaveLength(1);
      expect(result.data.options[0].name).toBe("GPS");
      expect(result.data.options[0].dailyPrice).toBe("10.00");
      expect(result.data.options[0].totalPrice).toBe("30.00");

      // Invoice
      expect(result.data.invoice).toEqual({
        id: INVOICE_ID,
        invoiceNumber: "INV-2026-0001",
        status: "paid",
        totalAmount: "285.00",
        issuedAt: new Date("2026-04-05T08:00:00"),
      });
    }
  });

  it("returns invoice null when no invoice exists", async () => {
    mockSelectChainSequence([[CONTRACT_ROW], [], []]);

    const result = await getContractById(CONTRACT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoice).toBeNull();
      expect(result.data.options).toHaveLength(0);
    }
  });

  it("returns null categoryName when vehicle has no category (left join)", async () => {
    mockSelectChainSequence([
      [{ ...CONTRACT_ROW, categoryName: null }],
      [],
      [],
    ]);

    const result = await getContractById(CONTRACT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicle.categoryName).toBeNull();
    }
  });

  it("works for viewer (contracts:read allowed)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockSelectChainSequence([[CONTRACT_ROW], [], []]);

    const result = await getContractById(CONTRACT_ID);

    expect(result.success).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Not found / invalid input
  // --------------------------------------------------------------------------

  it("returns French error when contract not found", async () => {
    mockSelectChainSequence([[]]);

    const result = await getContractById(CONTRACT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce contrat n'existe pas");
    }
  });

  it("returns not-found error for an invalid uuid (no matching row)", async () => {
    mockSelectChainSequence([[]]);

    const result = await getContractById("not-a-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce contrat n'existe pas");
    }
  });

  // --------------------------------------------------------------------------
  // Auth checks
  // --------------------------------------------------------------------------

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getContractById(CONTRACT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects inactive user account", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...ADMIN_USER,
      isActive: false,
    });

    const result = await getContractById(CONTRACT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("inactive");
    }
  });

  // --------------------------------------------------------------------------
  // DB error handling
  // --------------------------------------------------------------------------

  it("handles DB error gracefully with French error message", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getContractById(CONTRACT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement du contrat"
      );
    }
  });
});
