import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  listVehiclePhotos,
  saveVehiclePhoto,
  deleteVehiclePhoto,
  setCoverPhoto,
} from "@/actions/vehicle-photos";

// Mock supabase-server (used for storage deletion)
vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServerClient: () => ({
    storage: {
      from: () => ({
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  }),
}));

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const PHOTO_ID = "e0000000-0000-4000-8000-000000000001";
const PHOTO_ID_2 = "e0000000-0000-4000-8000-000000000002";

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

const PHOTO_URL =
  "https://test.supabase.co/storage/v1/object/public/vehicle-photos/tenant/vehicles/v1/photo.jpg";

const MOCK_PHOTO = {
  id: PHOTO_ID,
  url: PHOTO_URL,
  fileName: "photo.jpg",
  isCover: true,
  sortOrder: 0,
  createdAt: new Date("2025-01-01"),
};

const MOCK_PHOTO_2 = {
  id: PHOTO_ID_2,
  url: PHOTO_URL.replace("photo.jpg", "photo2.jpg"),
  fileName: "photo2.jpg",
  isCover: false,
  sortOrder: 1,
  createdAt: new Date("2025-01-02"),
};

// ============================================================================
// DB mock helpers
// ============================================================================

function mockSelectWithOrderBy(results: unknown[][]) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const currentResult = results[callIndex] ?? [];
    callIndex++;

    const resolvedValue = Promise.resolve(currentResult);
    const limit = vi.fn().mockReturnValue(resolvedValue);
    const orderBy = vi
      .fn()
      .mockReturnValue({ limit, then: resolvedValue.then.bind(resolvedValue) });
    const where = vi.fn().mockReturnValue({
      orderBy,
      then: resolvedValue.then.bind(resolvedValue),
      limit,
    });
    const from = vi.fn().mockReturnValue({
      where,
      orderBy,
    });
    return { from } as never;
  });
}

function mockInsertChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const values = vi.fn().mockReturnValue({ returning });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values, returning };
}

function mockUpdateChain(returnValue?: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue ?? []);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return { set, where, returning };
}

function mockDeleteChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  vi.mocked(db.delete).mockReturnValue({ where } as never);
  return { where };
}

// ============================================================================
// listVehiclePhotos
// ============================================================================

describe("listVehiclePhotos", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns photos for authorized user (admin)", async () => {
    // 1st select: vehicle exists → found
    // 2nd select: photos → list
    mockSelectWithOrderBy([[{ id: VEHICLE_ID }], [MOCK_PHOTO, MOCK_PHOTO_2]]);

    const result = await listVehiclePhotos(VEHICLE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe(PHOTO_ID);
      expect(result.data[1].id).toBe(PHOTO_ID_2);
    }
  });

  it("returns photos for agent", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockSelectWithOrderBy([[{ id: VEHICLE_ID }], [MOCK_PHOTO]]);

    const result = await listVehiclePhotos(VEHICLE_ID);
    expect(result.success).toBe(true);
  });

  it("returns photos for viewer", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockSelectWithOrderBy([[{ id: VEHICLE_ID }], []]);

    const result = await listVehiclePhotos(VEHICLE_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await listVehiclePhotos(VEHICLE_ID);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("returns error for vehicle from different tenant", async () => {
    // Vehicle not found (tenant filter)
    mockSelectWithOrderBy([[]]);

    const result = await listVehiclePhotos(VEHICLE_ID);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });
});

// ============================================================================
// saveVehiclePhoto
// ============================================================================

describe("saveVehiclePhoto", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  const VALID_INPUT = {
    vehicleId: VEHICLE_ID,
    url: PHOTO_URL,
    fileName: "photo.jpg",
  };

  it("saves photo for admin → success with id", async () => {
    // 1st select: vehicle exists → found
    // 2nd select: existing photos → empty (first photo)
    mockSelectWithOrderBy([[{ id: VEHICLE_ID }], []]);
    mockInsertChain([{ id: PHOTO_ID }]);
    mockUpdateChain();

    const result = await saveVehiclePhoto(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(PHOTO_ID);
    }
  });

  it("saves photo for agent → success", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockSelectWithOrderBy([[{ id: VEHICLE_ID }], [MOCK_PHOTO]]);
    mockInsertChain([{ id: PHOTO_ID_2 }]);

    const result = await saveVehiclePhoto(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it("auto-sets cover on first photo", async () => {
    // 1st select: vehicle exists
    // 2nd select: existing photos → empty (first)
    mockSelectWithOrderBy([[{ id: VEHICLE_ID }], []]);
    const insertMock = mockInsertChain([{ id: PHOTO_ID }]);
    mockUpdateChain();

    await saveVehiclePhoto(VALID_INPUT);

    // Verify insert was called with isCover: true
    expect(insertMock.values).toHaveBeenCalledWith(
      expect.objectContaining({ isCover: true })
    );
  });

  it("rejects viewer (no update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await saveVehiclePhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await saveVehiclePhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects invalid input (missing vehicleId)", async () => {
    const result = await saveVehiclePhoto({ url: PHOTO_URL });
    expect(result.success).toBe(false);
  });

  it("rejects invalid input (bad URL)", async () => {
    const result = await saveVehiclePhoto({
      vehicleId: VEHICLE_ID,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects vehicle from different tenant", async () => {
    mockSelectWithOrderBy([[]]);

    const result = await saveVehiclePhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });
});

// ============================================================================
// deleteVehiclePhoto
// ============================================================================

describe("deleteVehiclePhoto", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  const VALID_INPUT = {
    photoId: PHOTO_ID,
    vehicleId: VEHICLE_ID,
  };

  it("deletes photo for admin → success", async () => {
    // 1st select: vehicle exists
    // 2nd select: photo exists (non-cover)
    mockSelectWithOrderBy([
      [{ id: VEHICLE_ID }],
      [{ id: PHOTO_ID, url: PHOTO_URL, isCover: false }],
    ]);
    mockDeleteChain();

    const result = await deleteVehiclePhoto(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it("promotes next photo when cover is deleted", async () => {
    // 1st select: vehicle exists
    // 2nd select: photo exists (is cover)
    // After delete:
    // 3rd select: next photo found
    mockSelectWithOrderBy([
      [{ id: VEHICLE_ID }],
      [{ id: PHOTO_ID, url: PHOTO_URL, isCover: true }],
      [{ id: PHOTO_ID_2, url: MOCK_PHOTO_2.url }],
    ]);
    mockDeleteChain();
    mockUpdateChain();

    const result = await deleteVehiclePhoto(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it("rejects viewer (no update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await deleteVehiclePhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await deleteVehiclePhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects vehicle from different tenant", async () => {
    mockSelectWithOrderBy([[]]);

    const result = await deleteVehiclePhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("rejects photo not found", async () => {
    // Vehicle exists, but photo not found
    mockSelectWithOrderBy([[{ id: VEHICLE_ID }], []]);

    const result = await deleteVehiclePhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette photo n'existe pas");
    }
  });

  it("rejects invalid input", async () => {
    const result = await deleteVehiclePhoto({ photoId: "bad" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// setCoverPhoto
// ============================================================================

describe("setCoverPhoto", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  const VALID_INPUT = {
    photoId: PHOTO_ID_2,
    vehicleId: VEHICLE_ID,
  };

  it("sets cover photo for admin → success", async () => {
    // 1st select: vehicle exists
    // 2nd select: photo exists
    mockSelectWithOrderBy([
      [{ id: VEHICLE_ID }],
      [{ id: PHOTO_ID_2, url: MOCK_PHOTO_2.url }],
    ]);
    mockUpdateChain();

    const result = await setCoverPhoto(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it("sets cover photo for agent → success", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockSelectWithOrderBy([
      [{ id: VEHICLE_ID }],
      [{ id: PHOTO_ID_2, url: MOCK_PHOTO_2.url }],
    ]);
    mockUpdateChain();

    const result = await setCoverPhoto(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it("rejects viewer (no update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await setCoverPhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await setCoverPhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects vehicle from different tenant", async () => {
    mockSelectWithOrderBy([[]]);

    const result = await setCoverPhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("rejects photo not found", async () => {
    mockSelectWithOrderBy([[{ id: VEHICLE_ID }], []]);

    const result = await setCoverPhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette photo n'existe pas");
    }
  });

  it("rejects invalid input", async () => {
    const result = await setCoverPhoto({ photoId: "bad" });
    expect(result.success).toBe(false);
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await setCoverPhoto(VALID_INPUT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
