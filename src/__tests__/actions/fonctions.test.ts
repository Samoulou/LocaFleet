import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  listFonctions,
  createFonction,
  updateFonction,
  toggleFonctionActive,
} from "@/actions/fonctions";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const FONCTION_ID = "f0000000-0000-4000-8000-000000000001";

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
  name: "Déménagement",
  color: "#D97706",
  requiresEmployees: true,
  allowsContract: false,
  defaultTimeUnit: "hours",
  sortOrder: "2",
};

const MOCK_FONCTION_ROW = {
  id: FONCTION_ID,
  name: "Déménagement",
  color: "#D97706",
  requiresEmployees: true,
  allowsContract: false,
  defaultTimeUnit: "hours",
  isActive: true,
  sortOrder: 2,
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
    const where = vi.fn().mockReturnValue({
      then: resolvedValue.then.bind(resolvedValue),
      catch: resolvedValue.catch.bind(resolvedValue),
      orderBy,
    });
    const from = vi.fn().mockReturnValue({ where });
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

// ============================================================================
// listFonctions
// ============================================================================

describe("listFonctions", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns fonctions for admin", async () => {
    mockSelectChainSequence([[MOCK_FONCTION_ROW]]);

    const result = await listFonctions();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Déménagement");
      expect(result.data[0].requiresEmployees).toBe(true);
    }
  });

  it("returns empty array when no fonctions", async () => {
    mockSelectChainSequence([[]]);

    const result = await listFonctions();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await listFonctions();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects agent (no settings read permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);

    const result = await listFonctions();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await listFonctions();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// createFonction
// ============================================================================

describe("createFonction", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("creates fonction for admin → success with id", async () => {
    // 1st select: name uniqueness check → no duplicate
    mockSelectChainSequence([[]]);
    const { values } = mockInsertChain([{ id: FONCTION_ID }]);

    const result = await createFonction(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(FONCTION_ID);
    }
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        name: "Déménagement",
        requiresEmployees: true,
        allowsContract: false,
        defaultTimeUnit: "hours",
      })
    );
  });

  it("rejects duplicate name (same tenant) → French error", async () => {
    mockSelectChainSequence([[{ id: "other-fonction-id" }]]);

    const result = await createFonction(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Une fonction avec ce nom existe déjà");
    }
  });

  it("rejects invalid input (missing name)", async () => {
    const result = await createFonction({ name: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("requis");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createFonction(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects agent (no settings create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);

    const result = await createFonction(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await createFonction(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// updateFonction
// ============================================================================

describe("updateFonction", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  const UPDATE_INPUT = { ...VALID_INPUT, id: FONCTION_ID };

  it("updates fonction for admin → success", async () => {
    // 1st select: fonction exists → found
    // 2nd select: name uniqueness → no duplicate
    mockSelectChainSequence([[{ id: FONCTION_ID }], []]);
    mockUpdateChain([{ id: FONCTION_ID }]);

    const result = await updateFonction(UPDATE_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(FONCTION_ID);
    }
  });

  it("rejects fonction not found", async () => {
    mockSelectChainSequence([[]]);

    const result = await updateFonction(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette fonction n'existe pas");
    }
  });

  it("rejects duplicate name (excluding self)", async () => {
    mockSelectChainSequence([
      [{ id: FONCTION_ID }],
      [{ id: "other-fonction-id" }],
    ]);

    const result = await updateFonction(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Une fonction avec ce nom existe déjà");
    }
  });

  it("rejects agent (no settings update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);

    const result = await updateFonction(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await updateFonction(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// toggleFonctionActive
// ============================================================================

describe("toggleFonctionActive", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("deactivates fonction → success", async () => {
    const { set } = mockUpdateChain([{ id: FONCTION_ID }]);

    const result = await toggleFonctionActive({
      id: FONCTION_ID,
      isActive: false,
    });

    expect(result.success).toBe(true);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false })
    );
  });

  it("reactivates fonction → success", async () => {
    mockUpdateChain([{ id: FONCTION_ID }]);

    const result = await toggleFonctionActive({
      id: FONCTION_ID,
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects fonction not found", async () => {
    mockUpdateChain([]);

    const result = await toggleFonctionActive({
      id: FONCTION_ID,
      isActive: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette fonction n'existe pas");
    }
  });

  it("rejects invalid input", async () => {
    const result = await toggleFonctionActive({
      id: "not-a-uuid",
      isActive: "nope",
    });

    expect(result.success).toBe(false);
  });

  it("rejects agent (no settings update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);

    const result = await toggleFonctionActive({
      id: FONCTION_ID,
      isActive: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });
});
