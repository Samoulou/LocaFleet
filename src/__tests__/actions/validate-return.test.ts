import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  validateReturn,
  getReturnValidationPreview,
} from "@/actions/validate-return";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const CONTRACT_ID = "d0000000-0000-4000-8000-000000000001";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const INVOICE_ID = "e0000000-0000-4000-8000-000000000001";
const INSPECTION_ID = "f0000000-0000-4000-8000-000000000001";

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

const ACTIVE_CONTRACT = {
  id: CONTRACT_ID,
  tenantId: TENANT_ID,
  vehicleId: VEHICLE_ID,
  status: "active",
  departureMileage: 10000,
  returnMileage: 10500,
  includedKmPerDay: 100,
  excessKmRate: "0.50",
  totalDays: 3,
  baseAmount: "255.00",
  optionsAmount: "30.00",
};

const ACTIVE_CONTRACT_NO_KM = {
  ...ACTIVE_CONTRACT,
  includedKmPerDay: null,
  excessKmRate: null,
};

const SUBMITTED_RETURN_INSPECTION = {
  id: INSPECTION_ID,
  isDraft: false,
};

const EXISTING_INVOICE = {
  id: INVOICE_ID,
  lineItems: [
    {
      description: "Location vehicule (3 jours x 85.00 CHF/jour)",
      quantity: 3,
      unitPrice: "85.00",
      totalPrice: "255.00",
      type: "base_rental",
    },
    {
      description: "GPS",
      quantity: 1,
      unitPrice: "30.00",
      totalPrice: "30.00",
      type: "option",
    },
  ],
  subtotal: "285.00",
  taxRate: "0",
  taxAmount: "0",
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

// ============================================================================
// validateReturn tests
// ============================================================================

describe("validateReturn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockInsertChain();
    mockUpdateChain();
  });

  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("validates return — no excess km, no damages", async () => {
    mockSelectChainSequence([
      [ACTIVE_CONTRACT_NO_KM], // contract fetch
      [SUBMITTED_RETURN_INSPECTION], // return inspection check
      [EXISTING_INVOICE], // existing invoice
    ]);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contractId).toBe(CONTRACT_ID);
      expect(result.data.excessKm).toBe(0);
      expect(result.data.excessKmAmount).toBe(0);
      expect(result.data.damagesAmount).toBe(0);
      expect(result.data.totalAmount).toBe(285); // 255 + 30
    }
  });

  it("validates return — with excess km", async () => {
    // 500km driven, 300km included (100/day * 3 days), 200km excess at 0.50/km = 100
    mockSelectChainSequence([
      [ACTIVE_CONTRACT], // contract fetch
      [SUBMITTED_RETURN_INSPECTION], // return inspection
      [EXISTING_INVOICE], // existing invoice
    ]);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.excessKm).toBe(200);
      expect(result.data.excessKmAmount).toBe(100);
      expect(result.data.totalAmount).toBe(385); // 255 + 30 + 100
    }
  });

  it("validates return — with damages amount", async () => {
    mockSelectChainSequence([
      [ACTIVE_CONTRACT_NO_KM],
      [SUBMITTED_RETURN_INSPECTION],
      [EXISTING_INVOICE],
    ]);

    const result = await validateReturn({
      contractId: CONTRACT_ID,
      damagesAmount: 200,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.damagesAmount).toBe(200);
      expect(result.data.totalAmount).toBe(485); // 255 + 30 + 200
    }
  });

  it("validates return — with excess km AND damages", async () => {
    mockSelectChainSequence([
      [ACTIVE_CONTRACT],
      [SUBMITTED_RETURN_INSPECTION],
      [EXISTING_INVOICE],
    ]);

    const result = await validateReturn({
      contractId: CONTRACT_ID,
      damagesAmount: 150,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.excessKm).toBe(200);
      expect(result.data.excessKmAmount).toBe(100);
      expect(result.data.damagesAmount).toBe(150);
      expect(result.data.totalAmount).toBe(535); // 255 + 30 + 100 + 150
    }
  });

  it("updates contract, invoice, and vehicle", async () => {
    mockSelectChainSequence([
      [ACTIVE_CONTRACT],
      [SUBMITTED_RETURN_INSPECTION],
      [EXISTING_INVOICE],
    ]);

    await validateReturn(VALID_INPUT);

    // update called for: contract, invoice, vehicle
    expect(db.update).toHaveBeenCalledTimes(3);
    // insert called for audit log
    expect(db.insert).toHaveBeenCalled();
  });

  it("handles no existing invoice gracefully (just skips invoice update)", async () => {
    mockSelectChainSequence([
      [ACTIVE_CONTRACT_NO_KM],
      [SUBMITTED_RETURN_INSPECTION],
      [], // no invoice found
    ]);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(true);
    // update called for: contract + vehicle only (no invoice update)
    expect(db.update).toHaveBeenCalledTimes(2);
  });

  // --------------------------------------------------------------------------
  // Business logic errors
  // --------------------------------------------------------------------------

  it("rejects if contract not found", async () => {
    mockSelectChainSequence([[]]);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce contrat n'existe pas");
    }
  });

  it("rejects if contract not active", async () => {
    mockSelectChainSequence([[{ ...ACTIVE_CONTRACT, status: "draft" }]]);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("contrats actifs");
    }
  });

  it("rejects if returnMileage not set", async () => {
    mockSelectChainSequence([[{ ...ACTIVE_CONTRACT, returnMileage: null }]]);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("kilométrage de retour");
    }
  });

  it("rejects if departureMileage not set", async () => {
    mockSelectChainSequence([[{ ...ACTIVE_CONTRACT, departureMileage: null }]]);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("kilométrage de départ");
    }
  });

  it("rejects if returnMileage < departureMileage", async () => {
    mockSelectChainSequence([
      [{ ...ACTIVE_CONTRACT, returnMileage: 9000, departureMileage: 10000 }],
    ]);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("inférieur");
    }
  });

  it("rejects if no submitted return inspection", async () => {
    mockSelectChainSequence([
      [ACTIVE_CONTRACT],
      [], // no return inspection
    ]);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("constat de retour validé");
    }
  });

  it("rejects if return inspection is still draft", async () => {
    mockSelectChainSequence([
      [ACTIVE_CONTRACT],
      [{ id: INSPECTION_ID, isDraft: true }],
    ]);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("constat de retour validé");
    }
  });

  // --------------------------------------------------------------------------
  // Auth checks
  // --------------------------------------------------------------------------

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer role", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  // --------------------------------------------------------------------------
  // Validation errors
  // --------------------------------------------------------------------------

  it("rejects invalid contractId", async () => {
    const result = await validateReturn({ contractId: "not-a-uuid" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  it("rejects missing contractId", async () => {
    const result = await validateReturn({});

    expect(result.success).toBe(false);
  });

  it("rejects negative damagesAmount", async () => {
    const result = await validateReturn({
      contractId: CONTRACT_ID,
      damagesAmount: -50,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("négatif");
    }
  });

  // --------------------------------------------------------------------------
  // DB error handling
  // --------------------------------------------------------------------------

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await validateReturn(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// getReturnValidationPreview tests
// ============================================================================

describe("getReturnValidationPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns preview with excess km calculation", async () => {
    const contractForPreview = {
      id: CONTRACT_ID,
      contractNumber: "LOC-2026-0001",
      status: "active",
      departureMileage: 10000,
      returnMileage: 10500,
      includedKmPerDay: 100,
      excessKmRate: "0.50",
      totalDays: 3,
      baseAmount: "255.00",
      optionsAmount: "30.00",
      totalAmount: "285.00",
    };

    const damages = [
      {
        id: "dmg-1",
        zone: "front",
        type: "scratch",
        severity: "low",
        description: "Rayure pare-chocs",
      },
    ];

    mockSelectChainSequence([
      [contractForPreview], // contract fetch
      damages, // damages fetch (via innerJoin)
    ]);

    const result = await getReturnValidationPreview(CONTRACT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contractId).toBe(CONTRACT_ID);
      expect(result.data.totalKmDriven).toBe(500);
      expect(result.data.includedKm).toBe(300);
      expect(result.data.excessKm).toBe(200);
      expect(result.data.excessKmAmount).toBe(100);
      expect(result.data.newDamagesCount).toBe(1);
    }
  });

  it("returns preview with no excess km when not configured", async () => {
    mockSelectChainSequence([
      [
        {
          id: CONTRACT_ID,
          contractNumber: "LOC-2026-0001",
          status: "active",
          departureMileage: 10000,
          returnMileage: 10200,
          includedKmPerDay: null,
          excessKmRate: null,
          totalDays: 3,
          baseAmount: "255.00",
          optionsAmount: "0",
          totalAmount: "255.00",
        },
      ],
      [], // no damages
    ]);

    const result = await getReturnValidationPreview(CONTRACT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.excessKm).toBe(0);
      expect(result.data.excessKmAmount).toBe(0);
    }
  });

  it("rejects if contract not found", async () => {
    mockSelectChainSequence([[]]);

    const result = await getReturnValidationPreview(CONTRACT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce contrat n'existe pas");
    }
  });

  it("rejects if contract not active", async () => {
    mockSelectChainSequence([
      [
        {
          ...ACTIVE_CONTRACT,
          contractNumber: "LOC-2026-0001",
          status: "completed",
          totalAmount: "285.00",
        },
      ],
    ]);

    const result = await getReturnValidationPreview(CONTRACT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("actifs");
    }
  });

  it("rejects invalid contractId", async () => {
    const result = await getReturnValidationPreview("not-a-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getReturnValidationPreview(CONTRACT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });
});
