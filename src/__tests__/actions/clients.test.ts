import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  searchClients,
  quickCreateClient,
  listClients,
  getClient,
  createClient,
  updateClient,
  toggleClientTrusted,
  softDeleteClient,
  getClientKPIs,
} from "@/actions/clients";

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

const OTHER_TENANT_ID = "a0000000-0000-4000-8000-000000000099";

const VALID_CREATE_INPUT = {
  firstName: "Marie",
  lastName: "Martin",
  phone: "+41 79 987 65 43",
  email: "marie.martin@example.ch",
  licenseNumber: "G 12345678",
  isTrusted: false,
};

const VALID_CLIENT_FORM_INPUT = {
  firstName: "Marie",
  lastName: "Martin",
  email: "marie.martin@example.ch",
  phone: "+41 79 987 65 43",
  dateOfBirth: "1990-01-15",
  address: "Rue de Lausanne 10, 1003 Lausanne",
  licenseNumber: "G 12345678",
  licenseCategory: "B",
  licenseExpiry: "2028-06-30",
  identityDocType: "passport",
  identityDocNumber: "X1234567",
  companyName: "Martin SA",
  notes: "Client fidele",
  isTrusted: false,
};

const MOCK_CLIENT_DETAIL = {
  id: CLIENT_ID,
  firstName: "Jean",
  lastName: "Dupont",
  email: "jean.dupont@example.ch",
  phone: "+41 79 123 45 67",
  dateOfBirth: "1985-03-20",
  address: "Rue de Geneve 5, 1200 Geneve",
  licenseNumber: "G 87654321",
  licenseCategory: "B",
  licenseExpiry: "2027-12-31",
  identityDocType: "identity_card",
  identityDocNumber: "C9876543",
  companyName: null,
  notes: null,
  isTrusted: true,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-06-01"),
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

function mockUpdateChain(returning?: unknown[]) {
  const returningFn = vi
    .fn()
    .mockResolvedValue(returning ?? [{ id: CLIENT_ID }]);
  const whereObj = { returning: returningFn };
  const whereFn = vi.fn().mockReturnValue(whereObj);
  const setFn = vi.fn().mockReturnValue({ where: whereFn });
  vi.mocked(db.update).mockReturnValue({ set: setFn } as never);
  return { set: setFn, where: whereFn, returning: returningFn };
}

/**
 * Creates a deeply chainable mock for db.select() that supports
 * .from().leftJoin().where().orderBy().limit().offset()
 * Each call returns the same chain, resolving to `results`.
 * Supports multiple sequential calls via `mockReturnValueOnce`.
 */
function mockFullSelectChain(results: unknown[]) {
  const resolved = Promise.resolve(results);
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    "from",
    "leftJoin",
    "innerJoin",
    "where",
    "orderBy",
    "limit",
    "offset",
    "groupBy",
    "as",
  ]) {
    chain[method] = vi.fn();
  }
  // Each method returns the chain itself (thenable via resolved promise)
  const chainObj = Object.assign(resolved, chain);
  for (const method of Object.keys(chain)) {
    chain[method].mockReturnValue(chainObj);
  }
  vi.mocked(db.select).mockReturnValue({ from: chain.from } as never);
  return chain;
}

/**
 * Mock for listClients which calls db.select() 3 times:
 * 1. Subquery build (groupBy/as) — returns a subquery reference
 * 2. Main data query — resolves to `rows`
 * 3. Count query — resolves to [{ value: totalCount }]
 */
function mockListClientsDb(rows: unknown[], totalCount: number) {
  const methods = [
    "from",
    "leftJoin",
    "innerJoin",
    "where",
    "orderBy",
    "limit",
    "offset",
    "groupBy",
    "as",
  ];

  let callIndex = 0;
  vi.mocked(db.select).mockImplementation(() => {
    // Call 0: subquery (doesn't need to resolve to data, just needs chain methods)
    // Call 1: main data query (resolves to rows)
    // Call 2: count query (resolves to [{ value: totalCount }])
    const allResults = [rows, rows, [{ value: totalCount }]];
    const results = allResults[callIndex] ?? [];
    callIndex++;
    const resolved = Promise.resolve(results);
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of methods) {
      chain[m] = vi.fn();
    }
    const chainObj = Object.assign(resolved, chain);
    for (const m of Object.keys(chain)) {
      chain[m].mockReturnValue(chainObj);
    }
    return { from: chain.from } as never;
  });
}

/**
 * Mock for getClientKPIs which now uses a single db.select() with LEFT JOIN.
 */
function mockKPIsDb(total: number, trusted: number, active: number) {
  const results = [
    { totalClients: total, trustedClients: trusted, activeRentals: active },
  ];
  const resolved = Promise.resolve(results);
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["from", "leftJoin", "where"]) {
    chain[m] = vi.fn();
  }
  const chainObj = Object.assign(resolved, chain);
  for (const m of Object.keys(chain)) {
    chain[m].mockReturnValue(chainObj);
  }
  vi.mocked(db.select).mockReturnValue({
    from: chain.from,
  } as never);
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

// ============================================================================
// listClients tests
// ============================================================================

describe("listClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns a paginated list of clients for the tenant", async () => {
    const mockRows = [
      {
        ...MOCK_CLIENT,
        licenseNumber: null,
        contractCount: 2,
        createdAt: new Date(),
      },
    ];
    mockListClientsDb(mockRows, 1);

    const result = await listClients({ page: 1, pageSize: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clients).toHaveLength(1);
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.totalCount).toBe(1);
    }
  });

  it("applies default params when input is empty", async () => {
    mockListClientsDb([], 0);

    const result = await listClients({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("rejects invalid params (page < 1)", async () => {
    const result = await listClients({ page: 0 });

    expect(result.success).toBe(false);
  });

  it("rejects invalid params (pageSize > 100)", async () => {
    const result = await listClients({ pageSize: 200 });

    expect(result.success).toBe(false);
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await listClients({ page: 1, pageSize: 20 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("allows viewer to read clients list", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockListClientsDb([], 0);

    const result = await listClients({});

    expect(result.success).toBe(true);
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await listClients({ page: 1, pageSize: 20 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// getClient tests
// ============================================================================

describe("getClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns the full client detail by ID", async () => {
    mockFullSelectChain([MOCK_CLIENT_DETAIL]);

    const result = await getClient(CLIENT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CLIENT_ID);
      expect(result.data.firstName).toBe("Jean");
      expect(result.data.lastName).toBe("Dupont");
      expect(result.data.email).toBe("jean.dupont@example.ch");
    }
  });

  it("rejects a non-UUID id", async () => {
    const result = await getClient("not-a-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("introuvable");
    }
    // Should not call db.select at all
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns error when client not found (other tenant / deleted)", async () => {
    mockFullSelectChain([]);

    const result = await getClient(CLIENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("introuvable");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getClient(CLIENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("allows viewer to read client detail", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockFullSelectChain([MOCK_CLIENT_DETAIL]);

    const result = await getClient(CLIENT_ID);

    expect(result.success).toBe(true);
  });

  it("filters by tenantId (where clause called)", async () => {
    const chain = mockFullSelectChain([MOCK_CLIENT_DETAIL]);

    await getClient(CLIENT_ID);

    expect(chain.where).toHaveBeenCalled();
    expect(db.select).toHaveBeenCalled();
  });
});

// ============================================================================
// createClient tests
// ============================================================================

describe("createClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("creates a client with required fields and returns the id", async () => {
    mockInsertChain([{ id: CLIENT_ID }]);

    const result = await createClient(VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CLIENT_ID);
    }
  });

  it("creates a client with only required fields (optional fields omitted)", async () => {
    mockInsertChain([{ id: CLIENT_ID }]);

    const result = await createClient({
      firstName: "Marie",
      lastName: "Martin",
      email: "marie@example.ch",
      phone: "+41 79 000 00 00",
      isTrusted: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects when required fields are missing", async () => {
    const result = await createClient({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid email", async () => {
    const result = await createClient({
      ...VALID_CLIENT_FORM_INPUT,
      email: "bad-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalide");
    }
  });

  it("rejects viewer (no create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await createClient(VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createClient(VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("allows agent to create client", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockInsertChain([{ id: CLIENT_ID }]);

    const result = await createClient(VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(true);
  });

  it("sets tenantId from current user", async () => {
    const chain = mockInsertChain([{ id: CLIENT_ID }]);

    await createClient(VALID_CLIENT_FORM_INPUT);

    expect(chain.values).toHaveBeenCalled();
    const insertedValues = chain.values.mock.calls[0][0];
    expect(insertedValues.tenantId).toBe(TENANT_ID);
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.insert).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await createClient(VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// updateClient tests
// ============================================================================

describe("updateClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("updates an existing client and returns the id", async () => {
    // First call: db.select (check existence), Second call: db.update
    mockFullSelectChain([{ id: CLIENT_ID }]);
    mockUpdateChain([{ id: CLIENT_ID }]);

    const result = await updateClient(CLIENT_ID, VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CLIENT_ID);
    }
  });

  it("rejects a non-UUID id", async () => {
    const result = await updateClient("not-a-uuid", VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("introuvable");
    }
  });

  it("rejects when client not found (other tenant or deleted)", async () => {
    mockFullSelectChain([]);

    const result = await updateClient(CLIENT_ID, VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("introuvable");
    }
  });

  it("rejects invalid input data", async () => {
    const result = await updateClient(CLIENT_ID, {
      ...VALID_CLIENT_FORM_INPUT,
      email: "bad-email",
    });

    expect(result.success).toBe(false);
  });

  it("rejects viewer (no update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await updateClient(CLIENT_ID, VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await updateClient(CLIENT_ID, VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("allows agent to update client", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockFullSelectChain([{ id: CLIENT_ID }]);
    mockUpdateChain([{ id: CLIENT_ID }]);

    const result = await updateClient(CLIENT_ID, VALID_CLIENT_FORM_INPUT);

    expect(result.success).toBe(true);
  });
});

// ============================================================================
// toggleClientTrusted tests
// ============================================================================

describe("toggleClientTrusted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("toggles isTrusted from false to true", async () => {
    mockFullSelectChain([{ isTrusted: false }]);
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as never);

    const result = await toggleClientTrusted(CLIENT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CLIENT_ID);
      expect(result.data.isTrusted).toBe(true);
    }
  });

  it("toggles isTrusted from true to false", async () => {
    mockFullSelectChain([{ isTrusted: true }]);
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as never);

    const result = await toggleClientTrusted(CLIENT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isTrusted).toBe(false);
    }
  });

  it("returns error when client not found (other tenant)", async () => {
    mockFullSelectChain([]);

    const result = await toggleClientTrusted(CLIENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("introuvable");
    }
  });

  it("rejects viewer (no update permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await toggleClientTrusted(CLIENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await toggleClientTrusted(CLIENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });
});

// ============================================================================
// softDeleteClient tests
// ============================================================================

describe("softDeleteClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("soft-deletes a client without active contracts", async () => {
    // First db.select: check for active contracts -> none found
    // Then db.update: soft delete -> returns id
    let selectCallIndex = 0;
    vi.mocked(db.select).mockImplementation(() => {
      const results = selectCallIndex === 0 ? [] : [];
      selectCallIndex++;
      const resolved = Promise.resolve(results);
      const chain: Record<string, ReturnType<typeof vi.fn>> = {};
      for (const m of [
        "from",
        "leftJoin",
        "innerJoin",
        "where",
        "orderBy",
        "limit",
        "offset",
      ]) {
        chain[m] = vi.fn();
      }
      const chainObj = Object.assign(resolved, chain);
      for (const m of Object.keys(chain)) {
        chain[m].mockReturnValue(chainObj);
      }
      return { from: chain.from } as never;
    });
    mockUpdateChain([{ id: CLIENT_ID }]);

    const result = await softDeleteClient(CLIENT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(CLIENT_ID);
    }
  });

  it("refuses to delete a client with active contracts", async () => {
    // db.select: check for active contracts -> found one
    mockFullSelectChain([{ id: "contract-123" }]);

    const result = await softDeleteClient(CLIENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("contrats actifs");
    }
  });

  it("rejects a non-UUID id", async () => {
    const result = await softDeleteClient("not-a-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("introuvable");
    }
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects viewer (no delete permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await softDeleteClient(CLIENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await softDeleteClient(CLIENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("allows agent to delete client", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
    mockFullSelectChain([]);
    mockUpdateChain([{ id: CLIENT_ID }]);

    const result = await softDeleteClient(CLIENT_ID);

    expect(result.success).toBe(true);
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await softDeleteClient(CLIENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// getClientKPIs tests
// ============================================================================

describe("getClientKPIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns correct KPI counts", async () => {
    mockKPIsDb(42, 10, 5);

    const result = await getClientKPIs();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalClients).toBe(42);
      expect(result.data.trustedClients).toBe(10);
      expect(result.data.activeRentals).toBe(5);
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getClientKPIs();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("allows viewer to read KPIs", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);
    mockKPIsDb(10, 3, 1);

    const result = await getClientKPIs();

    expect(result.success).toBe(true);
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await getClientKPIs();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});
