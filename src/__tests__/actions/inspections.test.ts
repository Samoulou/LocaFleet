import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  createDraftInspection,
  submitDepartureInspection,
  updateDepartureInspection,
  getDepartureInspection,
} from "@/actions/inspections";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const CONTRACT_ID = "d0000000-0000-4000-8000-000000000001";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const INSPECTION_ID = "f0000000-0000-4000-8000-000000000001";
const PHOTO_ID = "f0000000-0000-4000-8000-000000000002";

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

const APPROVED_CONTRACT = {
  id: CONTRACT_ID,
  tenantId: TENANT_ID,
  vehicleId: VEHICLE_ID,
  status: "approved",
};

const PENDING_CG_CONTRACT = {
  id: CONTRACT_ID,
  tenantId: TENANT_ID,
  vehicleId: VEHICLE_ID,
  status: "pending_cg",
};

const ACTIVE_CONTRACT = {
  id: CONTRACT_ID,
  tenantId: TENANT_ID,
  vehicleId: VEHICLE_ID,
  status: "active",
};

const DRAFT_CONTRACT = {
  id: CONTRACT_ID,
  tenantId: TENANT_ID,
  vehicleId: VEHICLE_ID,
  status: "draft",
};

const DRAFT_INSPECTION = {
  id: INSPECTION_ID,
  tenantId: TENANT_ID,
  contractId: CONTRACT_ID,
  vehicleId: VEHICLE_ID,
  type: "departure",
  isDraft: true,
  mileage: 0,
  fuelLevel: "empty",
  exteriorCleanliness: null,
  interiorCleanliness: null,
  clientSignatureUrl: null,
  agentNotes: null,
  conductedAt: new Date(),
};

const SUBMITTED_INSPECTION = {
  ...DRAFT_INSPECTION,
  isDraft: false,
  mileage: 45000,
  fuelLevel: "three_quarter",
  exteriorCleanliness: "clean",
  interiorCleanliness: "clean",
};

const VALID_SUBMIT_INPUT = {
  inspectionId: INSPECTION_ID,
  contractId: CONTRACT_ID,
  mileage: 45000,
  fuelLevel: "three_quarter" as const,
  exteriorCleanliness: "clean" as const,
  interiorCleanliness: "clean" as const,
  agentNotes: "RAS",
  damages: [],
};

const VALID_SUBMIT_WITH_DAMAGES = {
  ...VALID_SUBMIT_INPUT,
  damages: [
    {
      zone: "front" as const,
      type: "scratch" as const,
      severity: "low" as const,
      description: "Petite rayure pare-chocs",
      isPreExisting: true,
    },
  ],
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
    .mockResolvedValue(returning ?? [{ id: INSPECTION_ID }]);
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

function mockDeleteChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  vi.mocked(db.delete).mockReturnValue({ where } as never);
  return { where };
}

// ============================================================================
// createDraftInspection
// ============================================================================

describe("createDraftInspection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockInsertChain();
    mockUpdateChain();
    mockDeleteChain();
  });

  it("creates draft for approved contract", async () => {
    mockSelectChainSequence([
      [APPROVED_CONTRACT], // contract fetch
      [], // no existing inspection
    ]);

    const result = await createDraftInspection({ contractId: CONTRACT_ID });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspectionId).toBe(INSPECTION_ID);
    }
    expect(db.insert).toHaveBeenCalled();
  });

  it("creates draft for pending_cg contract", async () => {
    mockSelectChainSequence([[PENDING_CG_CONTRACT], []]);

    const result = await createDraftInspection({ contractId: CONTRACT_ID });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspectionId).toBe(INSPECTION_ID);
    }
  });

  it("rejects if contract not approved/pending_cg", async () => {
    mockSelectChainSequence([[DRAFT_CONTRACT]]);

    const result = await createDraftInspection({ contractId: CONTRACT_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("approuvé");
    }
  });

  it("rejects if departure inspection already exists", async () => {
    mockSelectChainSequence([
      [APPROVED_CONTRACT],
      [{ id: "existing-inspection" }], // existing inspection found
    ]);

    const result = await createDraftInspection({ contractId: CONTRACT_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("existe déjà");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createDraftInspection({ contractId: CONTRACT_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer role", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await createDraftInspection({ contractId: CONTRACT_ID });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects invalid contractId", async () => {
    const result = await createDraftInspection({ contractId: "bad-id" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });
});

// ============================================================================
// submitDepartureInspection
// ============================================================================

describe("submitDepartureInspection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockInsertChain();
    mockUpdateChain();
    mockDeleteChain();
  });

  it("submits draft -> inspection isDraft=false, contract becomes active", async () => {
    mockSelectChainSequence([
      [DRAFT_INSPECTION], // inspection fetch
      [APPROVED_CONTRACT], // contract fetch
    ]);

    const result = await submitDepartureInspection(VALID_SUBMIT_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspectionId).toBe(INSPECTION_ID);
    }
    expect(db.update).toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalled();
  });

  it("submits with damages (inserted)", async () => {
    mockSelectChainSequence([[DRAFT_INSPECTION], [APPROVED_CONTRACT]]);

    const result = await submitDepartureInspection(VALID_SUBMIT_WITH_DAMAGES);

    expect(result.success).toBe(true);
    // insert called for: damages + audit log
    expect(db.insert).toHaveBeenCalled();
  });

  it("rejects if inspection not a draft", async () => {
    mockSelectChainSequence([
      [SUBMITTED_INSPECTION], // isDraft = false
    ]);

    const result = await submitDepartureInspection(VALID_SUBMIT_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("déjà été soumis");
    }
  });

  it("rejects if contract not approved/pending_cg", async () => {
    mockSelectChainSequence([
      [DRAFT_INSPECTION],
      [ACTIVE_CONTRACT], // status is active, not approved
    ]);

    const result = await submitDepartureInspection(VALID_SUBMIT_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("approuvé");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await submitDepartureInspection(VALID_SUBMIT_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer role", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await submitDepartureInspection(VALID_SUBMIT_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });
});

// ============================================================================
// updateDepartureInspection
// ============================================================================

describe("updateDepartureInspection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockInsertChain();
    mockUpdateChain();
    mockDeleteChain();
  });

  it("updates existing inspection, replaces damages", async () => {
    mockSelectChainSequence([
      [SUBMITTED_INSPECTION], // inspection (isDraft = false)
      [ACTIVE_CONTRACT], // contract (active)
    ]);

    const result = await updateDepartureInspection(VALID_SUBMIT_WITH_DAMAGES);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspectionId).toBe(INSPECTION_ID);
    }
    expect(db.update).toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  });

  it("rejects if contract not active", async () => {
    mockSelectChainSequence([
      [SUBMITTED_INSPECTION],
      [APPROVED_CONTRACT], // status is approved, not active
    ]);

    const result = await updateDepartureInspection(VALID_SUBMIT_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("actif");
    }
  });

  it("rejects if inspection is still a draft", async () => {
    mockSelectChainSequence([
      [DRAFT_INSPECTION], // isDraft = true
    ]);

    const result = await updateDepartureInspection(VALID_SUBMIT_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("brouillon");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await updateDepartureInspection(VALID_SUBMIT_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer role", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await updateDepartureInspection(VALID_SUBMIT_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });
});

// ============================================================================
// getDepartureInspection
// ============================================================================

describe("getDepartureInspection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns inspection with photos and damages", async () => {
    const photos = [
      {
        id: PHOTO_ID,
        url: "https://example.com/photo.jpg",
        fileName: "photo.jpg",
        position: "front",
        caption: null,
        sortOrder: 0,
      },
    ];
    const damages = [
      {
        id: "dmg-1",
        zone: "front",
        type: "scratch",
        severity: "low",
        description: "Rayure",
        photoUrl: null,
        isPreExisting: true,
      },
    ];

    mockSelectChainSequence([
      [SUBMITTED_INSPECTION], // inspection
      photos, // photos
      damages, // damages
    ]);

    const result = await getDepartureInspection(CONTRACT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toBeNull();
      expect(result.data!.id).toBe(INSPECTION_ID);
      expect(result.data!.photos).toHaveLength(1);
      expect(result.data!.damages).toHaveLength(1);
    }
  });

  it("returns null when no inspection exists", async () => {
    mockSelectChainSequence([
      [], // no inspection found
    ]);

    const result = await getDepartureInspection(CONTRACT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getDepartureInspection(CONTRACT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });
});
