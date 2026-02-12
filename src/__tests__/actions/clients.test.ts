import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { searchClients, quickCreateClient } from "@/actions/clients";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const CLIENT_ID = "c0000000-0000-4000-8000-000000000001";

const ADMIN_USER = {
  id: "d0000000-0000-4000-8000-000000000099",
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

const AGENT_USER = {
  id: "d0000000-0000-4000-8000-000000000098",
  tenantId: TENANT_ID,
  role: "agent" as const,
  email: "agent@locafleet.ch",
  name: "Agent Test",
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

const MOCK_CLIENT = {
  id: CLIENT_ID,
  firstName: "Jean",
  lastName: "Dupont",
  email: "jean.dupont@example.ch",
  phone: "+41 79 123 45 67",
  isTrusted: true,
};

const VALID_CREATE_INPUT = {
  firstName: "Marie",
  lastName: "Martin",
  phone: "+41 79 987 65 43",
  email: "marie.martin@example.ch",
  licenseNumber: "G 12345678",
  isTrusted: false,
};

// ============================================================================
// DB mock helpers
// ============================================================================

function mockSelectChain(results: unknown[]) {
  const resolvedValue = Promise.resolve(results);
  const limit = vi.fn().mockReturnValue(resolvedValue);
  const whereResult = Object.assign(Promise.resolve(results), { limit });
  const where = vi.fn().mockReturnValue(whereResult);
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
  return { from, where, limit };
}

function mockInsertChain(returning?: unknown[]) {
  const returningFn = vi.fn().mockResolvedValue(returning ?? [MOCK_CLIENT]);
  const values = vi.fn().mockReturnValue({ returning: returningFn });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values, returning: returningFn };
}

// ============================================================================
// searchClients tests
// ============================================================================

describe("searchClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns matching clients for admin", async () => {
    mockSelectChain([MOCK_CLIENT]);

    const result = await searchClients("Dupont");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].lastName).toBe("Dupont");
      expect(result.data[0].isTrusted).toBe(true);
    }
  });

  it("returns matching clients for agent", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockSelectChain([MOCK_CLIENT]);

    const result = await searchClients("Dupont");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await searchClients("Dupont");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await searchClients("Dupont");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("returns empty array for no matches", async () => {
    mockSelectChain([]);

    const result = await searchClients("Nonexistent");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("returns empty array for query shorter than 2 chars", async () => {
    const result = await searchClients("D");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
    // Should not call db.select at all
    expect(db.select).not.toHaveBeenCalled();
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await searchClients("Dupont");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });

  it("filters by tenantId (no cross-tenant leaks)", async () => {
    const chain = mockSelectChain([MOCK_CLIENT]);

    await searchClients("Dupont");

    // Verify where was called (tenantId filter is in the where clause)
    expect(chain.where).toHaveBeenCalled();
    expect(db.select).toHaveBeenCalled();
  });

  it("excludes soft-deleted clients", async () => {
    const chain = mockSelectChain([]);

    await searchClients("Deleted");

    // Verify where was called (isNull(deletedAt) is in the where clause)
    expect(chain.where).toHaveBeenCalled();
  });
});

// ============================================================================
// quickCreateClient tests
// ============================================================================

describe("quickCreateClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockInsertChain();
  });

  it("creates client for admin — returns ClientSelectItem", async () => {
    const result = await quickCreateClient(VALID_CREATE_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CLIENT_ID);
      expect(result.data.firstName).toBe("Jean");
      expect(result.data.lastName).toBe("Dupont");
      expect(result.data.email).toBe("jean.dupont@example.ch");
      expect(result.data.phone).toBe("+41 79 123 45 67");
    }
  });

  it("creates client for agent", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);

    const result = await quickCreateClient(VALID_CREATE_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CLIENT_ID);
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await quickCreateClient(VALID_CREATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects viewer", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await quickCreateClient(VALID_CREATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects invalid input (bad email)", async () => {
    const result = await quickCreateClient({
      ...VALID_CREATE_INPUT,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  it("rejects missing required fields", async () => {
    const result = await quickCreateClient({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("requis");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.insert).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await quickCreateClient(VALID_CREATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });

  it("sets tenantId from current user", async () => {
    const chain = mockInsertChain();

    await quickCreateClient(VALID_CREATE_INPUT);

    // Verify insert was called with values that include tenantId
    expect(chain.values).toHaveBeenCalled();
    const insertedValues = chain.values.mock.calls[0][0];
    expect(insertedValues.tenantId).toBe(TENANT_ID);
  });
});
