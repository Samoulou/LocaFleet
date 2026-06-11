import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  listVehicles,
  listVehicleCategories,
  getVehiclesForContractPicker,
  getVehicleWithPhotos,
} from "@/actions/vehicles";

// ============================================================================
// DB mock helpers
// ============================================================================

function mockVehicleSelectChain(
  dataResult: unknown[] = [],
  countResult: { value: number }[] = [{ value: 0 }]
) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const currentCall = callIndex++;

    if (currentCall === 0) {
      // Data query chain: select -> from -> leftJoin -> where -> orderBy -> limit -> offset
      const offset = vi.fn().mockResolvedValue(dataResult);
      const limit = vi.fn().mockReturnValue({ offset });
      const orderBy = vi.fn().mockReturnValue({ limit });
      const where = vi.fn().mockReturnValue({ orderBy });
      const leftJoin = vi.fn().mockReturnValue({ where });
      const from = vi.fn().mockReturnValue({ leftJoin });
      return { from } as never;
    }

    // Count query chain: select -> from -> where
    const where = vi.fn().mockResolvedValue(countResult);
    const from = vi.fn().mockReturnValue({ where });
    return { from } as never;
  });
}

function mockCategorySelectChain(returnValue: unknown[] = []) {
  const orderBy = vi.fn().mockResolvedValue(returnValue);
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
  return { from, where, orderBy };
}

// getVehiclesForContractPicker chain:
// select -> from -> leftJoin -> where -> orderBy (awaited)
function mockPickerSelectChain(rows: unknown[] = []) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ orderBy });
  const leftJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ leftJoin });
  vi.mocked(db.select).mockReturnValue({ from } as never);
  return { from, leftJoin, where, orderBy };
}

// getVehicleWithPhotos runs 2 queries in order:
// 1. vehicle: select -> from -> leftJoin -> where (awaited)
// 2. photos:  select -> from -> where -> orderBy (awaited)
function mockVehicleWithPhotosChains(
  vehicleRows: unknown[],
  photoRows: unknown[] = []
) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const isVehicleQuery = callIndex === 0;
    callIndex++;

    if (isVehicleQuery) {
      const where = vi.fn().mockResolvedValue(vehicleRows);
      const leftJoin = vi.fn().mockReturnValue({ where });
      const from = vi.fn().mockReturnValue({ leftJoin });
      return { from } as never;
    }

    const orderBy = vi.fn().mockResolvedValue(photoRows);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    return { from } as never;
  });
}

// ============================================================================
// Constants
// ============================================================================

const ADMIN_USER = {
  id: "a0000000-0000-4000-8000-000000000001",
  tenantId: "t0000000-0000-4000-8000-000000000001",
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

const AGENT_USER = {
  id: "a0000000-0000-4000-8000-000000000002",
  tenantId: "t0000000-0000-4000-8000-000000000001",
  role: "agent" as const,
  email: "agent@locafleet.ch",
  name: "Agent Test",
  isActive: true,
};

const VIEWER_USER = {
  id: "a0000000-0000-4000-8000-000000000003",
  tenantId: "t0000000-0000-4000-8000-000000000001",
  role: "viewer" as const,
  email: "viewer@locafleet.ch",
  name: "Viewer Test",
  isActive: true,
};

const MOCK_VEHICLE = {
  id: "v0000000-0000-4000-8000-000000000001",
  brand: "BMW",
  model: "X3",
  plateNumber: "VD 123456",
  categoryId: "c0000000-0000-4000-8000-000000000001",
  categoryName: "SUV",
  mileage: 45230,
  status: "available" as const,
  coverPhotoUrl: null,
};

const MOCK_CATEGORY = {
  id: "c0000000-0000-4000-8000-000000000001",
  name: "SUV",
};

// ============================================================================
// listVehicles
// ============================================================================

describe("listVehicles", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns paginated vehicles for admin", async () => {
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({ page: 1, pageSize: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
      expect(result.data.vehicles[0].brand).toBe("BMW");
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.totalCount).toBe(1);
    }
  });

  it("returns paginated vehicles for agent", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(AGENT_USER);
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
    }
  });

  it("returns paginated vehicles for viewer (read-only works)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(VIEWER_USER);
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
    }
  });

  it("returns error when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await listVehicles({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("filters by status when param provided", async () => {
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({ status: "available" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles[0].status).toBe("available");
    }
  });

  it("filters by category when param provided", async () => {
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({
      category: "c0000000-0000-4000-8000-000000000001",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
    }
  });

  it("searches by brand/model/plateNumber", async () => {
    mockVehicleSelectChain([MOCK_VEHICLE], [{ value: 1 }]);

    const result = await listVehicles({ search: "BMW" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
    }
  });

  it("returns empty list with totalCount=0", async () => {
    mockVehicleSelectChain([], [{ value: 0 }]);

    const result = await listVehicles({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
      expect(result.data.totalPages).toBe(0);
    }
  });

  it("computes totalPages correctly (45 items / 20 = 3 pages)", async () => {
    mockVehicleSelectChain([], [{ value: 45 }]);

    const result = await listVehicles({ page: 1, pageSize: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalPages).toBe(3);
      expect(result.data.totalCount).toBe(45);
    }
  });

  it("rejects invalid params (bad status)", async () => {
    const result = await listVehicles({ status: "flying" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("statut");
    }
  });

  it("handles DB error gracefully (French error)", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await listVehicles({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// listVehicleCategories
// ============================================================================

describe("listVehicleCategories", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns categories for authorized user", async () => {
    mockCategorySelectChain([MOCK_CATEGORY]);

    const result = await listVehicleCategories();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("SUV");
    }
  });

  it("returns error when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await listVehicleCategories();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("returns empty array when no categories", async () => {
    mockCategorySelectChain([]);

    const result = await listVehicleCategories();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});

// ============================================================================
// getVehiclesForContractPicker
// ============================================================================

const VEHICLE_UUID = "b0000000-0000-4000-8000-000000000001";

const PICKER_ROW = {
  id: VEHICLE_UUID,
  brand: "BMW",
  model: "X3",
  plateNumber: "VD 123456",
  status: "available" as const,
  dailyRateOverride: "85.00",
  categoryName: "SUV",
  categoryDailyRate: "120.00",
};

describe("getVehiclesForContractPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns vehicles with daily rate from override when set", async () => {
    mockPickerSelectChain([PICKER_ROW]);

    const result = await getVehiclesForContractPicker();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(VEHICLE_UUID);
      expect(result.data[0].brand).toBe("BMW");
      expect(result.data[0].plateNumber).toBe("VD 123456");
      expect(result.data[0].status).toBe("available");
      // Override "85.00" takes precedence over category "120.00"
      expect(result.data[0].dailyRate).toBe(85);
      expect(result.data[0].categoryName).toBe("SUV");
    }
  });

  it("falls back to category daily rate when no override", async () => {
    mockPickerSelectChain([{ ...PICKER_ROW, dailyRateOverride: null }]);

    const result = await getVehiclesForContractPicker();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].dailyRate).toBe(120);
    }
  });

  it("returns dailyRate=0 when neither override nor category rate exists", async () => {
    mockPickerSelectChain([
      {
        ...PICKER_ROW,
        dailyRateOverride: null,
        categoryName: null,
        categoryDailyRate: null,
      },
    ]);

    const result = await getVehiclesForContractPicker();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].dailyRate).toBe(0);
      expect(result.data[0].categoryName).toBeNull();
    }
  });

  it("returns empty array when no eligible vehicles", async () => {
    mockPickerSelectChain([]);

    const result = await getVehiclesForContractPicker();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("works for agent (contracts:create allowed)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockPickerSelectChain([PICKER_ROW]);

    const result = await getVehiclesForContractPicker();

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getVehiclesForContractPicker();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer (no contracts:create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await getVehiclesForContractPicker();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully with French error message", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getVehiclesForContractPicker();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement des véhicules"
      );
    }
  });
});

// ============================================================================
// getVehicleWithPhotos
// ============================================================================

const VEHICLE_DETAIL_ROW = {
  id: VEHICLE_UUID,
  brand: "BMW",
  model: "X3",
  plateNumber: "VD 123456",
  year: 2023,
  color: "Noir",
  vin: "WBAXG7C50DD123456",
  mileage: 45230,
  categoryId: "c0000000-0000-4000-8000-000000000001",
  categoryName: "SUV",
  categoryDailyRate: "120.00",
  fuelType: "diesel" as const,
  transmission: "automatic" as const,
  seats: 5,
  notes: "Véhicule récent",
  status: "available" as const,
  coverPhotoUrl: "https://example.com/cover.jpg",
  dailyRateOverride: "85.00",
  weeklyRateOverride: null,
  createdAt: new Date("2026-01-10T08:00:00"),
  updatedAt: new Date("2026-02-15T14:30:00"),
};

const PHOTO_ROWS = [
  {
    id: "p0000000-0000-4000-8000-000000000001",
    url: "https://example.com/photo-1.jpg",
    fileName: "photo-1.jpg",
    isCover: true,
    sortOrder: 0,
    createdAt: new Date("2026-01-10T08:05:00"),
  },
  {
    id: "p0000000-0000-4000-8000-000000000002",
    url: "https://example.com/photo-2.jpg",
    fileName: "photo-2.jpg",
    isCover: false,
    sortOrder: 1,
    createdAt: new Date("2026-01-10T08:06:00"),
  },
];

describe("getVehicleWithPhotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns full vehicle detail with photos", async () => {
    mockVehicleWithPhotosChains([VEHICLE_DETAIL_ROW], PHOTO_ROWS);

    const result = await getVehicleWithPhotos(VEHICLE_UUID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(VEHICLE_UUID);
      expect(result.data.brand).toBe("BMW");
      expect(result.data.model).toBe("X3");
      expect(result.data.plateNumber).toBe("VD 123456");
      expect(result.data.year).toBe(2023);
      expect(result.data.mileage).toBe(45230);
      expect(result.data.categoryName).toBe("SUV");
      expect(result.data.categoryDailyRate).toBe("120.00");
      expect(result.data.dailyRateOverride).toBe("85.00");
      expect(result.data.fuelType).toBe("diesel");
      expect(result.data.transmission).toBe("automatic");
      expect(result.data.createdAt).toEqual(new Date("2026-01-10T08:00:00"));
      expect(result.data.photos).toHaveLength(2);
      expect(result.data.photos[0].url).toBe("https://example.com/photo-1.jpg");
      expect(result.data.photos[0].isCover).toBe(true);
      expect(result.data.photos[1].sortOrder).toBe(1);
    }
  });

  it("returns vehicle with empty photos array", async () => {
    mockVehicleWithPhotosChains([VEHICLE_DETAIL_ROW], []);

    const result = await getVehicleWithPhotos(VEHICLE_UUID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.photos).toHaveLength(0);
    }
  });

  it("returns null category fields when vehicle has no category", async () => {
    mockVehicleWithPhotosChains(
      [
        {
          ...VEHICLE_DETAIL_ROW,
          categoryId: null,
          categoryName: null,
          categoryDailyRate: null,
        },
      ],
      []
    );

    const result = await getVehicleWithPhotos(VEHICLE_UUID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryName).toBeNull();
      expect(result.data.categoryDailyRate).toBeNull();
    }
  });

  it("returns French error for invalid uuid without querying DB", async () => {
    mockVehicleWithPhotosChains([VEHICLE_DETAIL_ROW], PHOTO_ROWS);

    const result = await getVehicleWithPhotos("not-a-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns French error when vehicle not found", async () => {
    mockVehicleWithPhotosChains([], []);

    const result = await getVehicleWithPhotos(VEHICLE_UUID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce véhicule n'existe pas");
    }
  });

  it("works for viewer (vehicles:read allowed)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockVehicleWithPhotosChains([VEHICLE_DETAIL_ROW], PHOTO_ROWS);

    const result = await getVehicleWithPhotos(VEHICLE_UUID);

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getVehicleWithPhotos(VEHICLE_UUID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("handles DB error gracefully with French error message", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getVehicleWithPhotos(VEHICLE_UUID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors du chargement du véhicule"
      );
    }
  });
});
