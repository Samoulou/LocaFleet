import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  listCategoriesWithCount,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/actions/categories";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const CATEGORY_ID = "c0000000-0000-4000-8000-000000000001";

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

const VALID_INPUT = {
  name: "SUV",
  description: "Sport Utility Vehicles",
  dailyRate: "120.00",
  weeklyRate: "650.00",
  sortOrder: "2",
};

const MOCK_CATEGORY_ROW = {
  id: CATEGORY_ID,
  name: "SUV",
  description: "Sport Utility Vehicles",
  dailyRate: "120.00",
  weeklyRate: "650.00",
  sortOrder: 2,
  vehicleCount: 3,
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
    const orderBy = vi.fn().mockReturnValue(resolvedValue);
    const groupBy = vi.fn().mockReturnValue({ orderBy });
    const where = vi.fn().mockReturnValue({
      ...resolvedValue,
      then: resolvedValue.then.bind(resolvedValue),
      groupBy,
    });
    const leftJoin = vi.fn().mockReturnValue({ where, groupBy });
    const from = vi.fn().mockReturnValue({ where, leftJoin });
    return { from } as never;
  });
}

function mockInsertChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const values = vi.fn().mockReturnValue({ returning });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values, returning };
}

function mockUpdateChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
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
// listCategoriesWithCount
// ============================================================================

describe("listCategoriesWithCount", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns categories with vehicle count for admin", async () => {
    mockSelectChainSequence([[MOCK_CATEGORY_ROW]]);

    const result = await listCategoriesWithCount();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("SUV");
      expect(result.data[0].vehicleCount).toBe(3);
    }
  });

  it("returns empty array when no categories", async () => {
    mockSelectChainSequence([[]]);

    const result = await listCategoriesWithCount();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await listCategoriesWithCount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects agent (no settings read permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);

    const result = await listCategoriesWithCount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await listCategoriesWithCount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// createCategory
// ============================================================================

describe("createCategory", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("creates category for admin → success with id", async () => {
    // 1st select: name uniqueness check → no duplicate
    mockSelectChainSequence([[]]);
    mockInsertChain([{ id: CATEGORY_ID }]);

    const result = await createCategory(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CATEGORY_ID);
    }
  });

  it("rejects duplicate name (same tenant) → French error", async () => {
    // 1st select: name uniqueness check → found duplicate
    mockSelectChainSequence([[{ id: "other-category-id" }]]);

    const result = await createCategory(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Une catégorie avec ce nom existe déjà");
    }
  });

  it("rejects invalid input (missing name)", async () => {
    const result = await createCategory({ name: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("requis");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createCategory(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects agent (no settings create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);

    const result = await createCategory(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await createCategory(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// updateCategory
// ============================================================================

describe("updateCategory", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  const UPDATE_INPUT = { ...VALID_INPUT, id: CATEGORY_ID };

  it("updates category for admin → success", async () => {
    // 1st select: category exists → found
    // 2nd select: name uniqueness → no duplicate
    mockSelectChainSequence([[{ id: CATEGORY_ID }], []]);
    mockUpdateChain([{ id: CATEGORY_ID }]);

    const result = await updateCategory(UPDATE_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CATEGORY_ID);
    }
  });

  it("rejects category not found", async () => {
    // 1st select: category exists → not found
    mockSelectChainSequence([[]]);

    const result = await updateCategory(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette catégorie n'existe pas");
    }
  });

  it("rejects duplicate name (excluding self)", async () => {
    // 1st select: category exists → found
    // 2nd select: name uniqueness → found duplicate (different category)
    mockSelectChainSequence([
      [{ id: CATEGORY_ID }],
      [{ id: "other-category-id" }],
    ]);

    const result = await updateCategory(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Une catégorie avec ce nom existe déjà");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await updateCategory(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects agent (no settings update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);

    const result = await updateCategory(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await updateCategory(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// deleteCategory
// ============================================================================

describe("deleteCategory", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("deletes category with 0 vehicles → success", async () => {
    // 1st select: category exists → found
    // 2nd select: vehicle count → 0
    mockSelectChainSequence([[{ id: CATEGORY_ID }], [{ value: 0 }]]);
    mockDeleteChain();

    const result = await deleteCategory(CATEGORY_ID);

    expect(result.success).toBe(true);
  });

  it("rejects delete when vehicles assigned → French warning with count", async () => {
    // 1st select: category exists → found
    // 2nd select: vehicle count → 3
    mockSelectChainSequence([[{ id: CATEGORY_ID }], [{ value: 3 }]]);

    const result = await deleteCategory(CATEGORY_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("3 véhicules");
      expect(result.error).toContain("Réassignez");
    }
  });

  it("rejects category not found", async () => {
    // 1st select: category exists → not found
    mockSelectChainSequence([[]]);

    const result = await deleteCategory(CATEGORY_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette catégorie n'existe pas");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await deleteCategory(CATEGORY_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects agent (no settings delete permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);

    const result = await deleteCategory(CATEGORY_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects invalid UUID", async () => {
    const result = await deleteCategory("not-a-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette catégorie n'existe pas");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await deleteCategory(CATEGORY_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
