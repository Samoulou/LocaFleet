import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  createQuote,
  updateQuote,
  updateQuoteStatus,
  convertQuoteToEvent,
  listQuotes,
  getQuoteById,
  deleteQuote,
} from "@/actions/quotes";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const CLIENT_ID = "c0000000-0000-4000-8000-000000000001";
const FONCTION_ID = "f0000000-0000-4000-8000-000000000001";
const QUOTE_ID = "ab000000-0000-4000-8000-000000000001";
const EVENT_ID = "e0000000-0000-4000-8000-000000000001";

const ADMIN_USER = {
  id: "d0000000-0000-4000-8000-000000000001",
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
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

const EMPLOYEE_USER = {
  id: "d0000000-0000-4000-8000-000000000050",
  tenantId: TENANT_ID,
  role: "employee" as const,
  email: "employee@locafleet.ch",
  name: "Employee Test",
  isActive: true,
};

const VALID_INPUT = {
  clientId: CLIENT_ID,
  fonctionId: FONCTION_ID,
  title: "Déménagement Dupont",
  startDate: "2026-07-01T08:00:00",
  endDate: "2026-07-01T17:00:00",
  lineItems: [
    { description: "Camion + 3 déménageurs", quantity: 8, unitPrice: "120" },
    { description: "Cartons", quantity: 30, unitPrice: "2.50" },
  ],
};

const ACCEPTED_QUOTE_ROW = {
  id: QUOTE_ID,
  status: "accepted",
  quoteNumber: "OFF-2026-0001",
  clientId: CLIENT_ID,
  fonctionId: FONCTION_ID,
  title: "Déménagement Dupont",
  startDate: new Date("2026-07-01T08:00:00"),
  endDate: new Date("2026-07-01T17:00:00"),
  totalAmount: "1035.00",
  notes: null,
};

// ============================================================================
// DB mock helpers
// ============================================================================

function mockSelectSequence(results: unknown[][]) {
  let callIndex = 0;

  vi.mocked(db.select).mockImplementation(() => {
    const current = results[callIndex] ?? [];
    callIndex++;

    const resolved = Promise.resolve(current);
    const chain: Record<string, unknown> = {
      then: resolved.then.bind(resolved),
      catch: resolved.catch.bind(resolved),
    };
    for (const method of [
      "where",
      "innerJoin",
      "leftJoin",
      "orderBy",
      "limit",
      "offset",
    ]) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    const from = vi.fn().mockReturnValue(chain);
    return { from } as never;
  });
}

function mockInsertSequence(returnValues: unknown[][]) {
  let callIndex = 0;
  const valuesCalls: unknown[] = [];
  const insertMock = vi.mocked(db.insert).mockImplementation(() => {
    const current = returnValues[callIndex] ?? [];
    callIndex++;
    const returning = vi.fn().mockResolvedValue(current);
    const values = vi.fn().mockImplementation((v: unknown) => {
      valuesCalls.push(v);
      return { returning };
    });
    return { values } as never;
  });
  return { valuesCalls, insertMock };
}

function mockUpdateChain(returnValue: unknown[] = []) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const whereResult = Object.assign(Promise.resolve(returnValue), {
    returning,
  });
  const where = vi.fn().mockReturnValue(whereResult);
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
// createQuote
// ============================================================================

describe("createQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("creates a quote with computed totals → OFF number", async () => {
    // selects: 1 fonction, 2 client, 3 number scan
    mockSelectSequence([
      [{ id: FONCTION_ID, isActive: true }],
      [{ id: CLIENT_ID }],
      [],
    ]);
    // inserts: 1 quotes, 2 auditLogs
    const { valuesCalls } = mockInsertSequence([[{ id: QUOTE_ID }], []]);

    const result = await createQuote(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quoteNumber).toMatch(/^OFF-\d{4}-0001$/);
    }
    // 8×120 + 30×2.50 = 960 + 75 = 1035.00
    expect(valuesCalls[0]).toMatchObject({
      tenantId: TENANT_ID,
      subtotal: "1035.00",
      totalAmount: "1035.00",
      taxRate: "0.00",
    });
  });

  it("rejects when fonction does not exist", async () => {
    mockSelectSequence([[]]);

    const result = await createQuote(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette fonction n'existe pas");
    }
  });

  it("rejects inactive fonction", async () => {
    mockSelectSequence([[{ id: FONCTION_ID, isActive: false }]]);

    const result = await createQuote(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette fonction est désactivée");
    }
  });

  it("rejects empty line items", async () => {
    const result = await createQuote({ ...VALID_INPUT, lineItems: [] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("ligne");
    }
  });

  it("rejects viewer (read-only on quotes)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await createQuote(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await createQuote(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// updateQuote
// ============================================================================

describe("updateQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  const UPDATE_INPUT = { ...VALID_INPUT, id: QUOTE_ID };

  it("updates a draft quote", async () => {
    // selects: 1 existing quote (draft), 2 fonction, 3 client
    mockSelectSequence([
      [{ id: QUOTE_ID, status: "draft" }],
      [{ id: FONCTION_ID, isActive: true }],
      [{ id: CLIENT_ID }],
    ]);
    mockUpdateChain([{ id: QUOTE_ID }]);

    const result = await updateQuote(UPDATE_INPUT);

    expect(result.success).toBe(true);
  });

  it("rejects updating a sent quote (immutable snapshot)", async () => {
    mockSelectSequence([[{ id: QUOTE_ID, status: "sent" }]]);

    const result = await updateQuote(UPDATE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("brouillon");
    }
  });

  it("rejects quote not found", async () => {
    mockSelectSequence([[]]);

    const result = await updateQuote(UPDATE_INPUT);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateQuoteStatus
// ============================================================================

describe("updateQuoteStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("allows draft → sent", async () => {
    mockSelectSequence([[{ id: QUOTE_ID, status: "draft" }]]);
    mockUpdateChain([{ id: QUOTE_ID }]);
    mockInsertSequence([[]]);

    const result = await updateQuoteStatus({ id: QUOTE_ID, status: "sent" });

    expect(result.success).toBe(true);
  });

  it("allows sent → accepted", async () => {
    mockSelectSequence([[{ id: QUOTE_ID, status: "sent" }]]);
    mockUpdateChain([{ id: QUOTE_ID }]);
    mockInsertSequence([[]]);

    const result = await updateQuoteStatus({
      id: QUOTE_ID,
      status: "accepted",
    });

    expect(result.success).toBe(true);
  });

  it("rejects accepted → draft (terminal)", async () => {
    mockSelectSequence([[{ id: QUOTE_ID, status: "accepted" }]]);

    const result = await updateQuoteStatus({ id: QUOTE_ID, status: "draft" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("transition");
    }
  });
});

// ============================================================================
// convertQuoteToEvent
// ============================================================================

describe("convertQuoteToEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("converts an accepted quote into a draft event", async () => {
    // selects: 1 quote, 2 already-converted check, 3 EVT number scan
    mockSelectSequence([[ACCEPTED_QUOTE_ROW], [], []]);
    // inserts: 1 events, 2 auditLogs
    const { valuesCalls } = mockInsertSequence([[{ id: EVENT_ID }], []]);

    const result = await convertQuoteToEvent(QUOTE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventId).toBe(EVENT_ID);
      expect(result.data.eventNumber).toMatch(/^EVT-\d{4}-0001$/);
    }
    expect(valuesCalls[0]).toMatchObject({
      tenantId: TENANT_ID,
      fonctionId: FONCTION_ID,
      clientId: CLIENT_ID,
      agreedAmount: "1035.00",
      quoteId: QUOTE_ID,
    });
  });

  it("rejects a non-accepted quote", async () => {
    mockSelectSequence([[{ ...ACCEPTED_QUOTE_ROW, status: "sent" }]]);

    const result = await convertQuoteToEvent(QUOTE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("acceptée");
    }
  });

  it("rejects a quote without period", async () => {
    mockSelectSequence([
      [{ ...ACCEPTED_QUOTE_ROW, startDate: null, endDate: null }],
    ]);

    const result = await convertQuoteToEvent(QUOTE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("période");
    }
  });

  it("rejects double conversion", async () => {
    mockSelectSequence([[ACCEPTED_QUOTE_ROW], [{ id: EVENT_ID }]]);

    const result = await convertQuoteToEvent(QUOTE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("déjà été convertie");
    }
  });

  it("rejects employee role (no events create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(EMPLOYEE_USER);

    const result = await convertQuoteToEvent(QUOTE_ID);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// listQuotes / getQuoteById / deleteQuote
// ============================================================================

describe("listQuotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns quotes with totals", async () => {
    const LIST_ROW = {
      id: QUOTE_ID,
      quoteNumber: "OFF-2026-0001",
      title: "Déménagement Dupont",
      status: "sent",
      totalAmount: "1035.00",
      validUntil: "2026-06-30",
      createdAt: new Date(),
      fonctionName: "Déménagement",
      fonctionColor: "#D97706",
      clientFirstName: "Jean",
      clientLastName: "Dupont",
    };
    mockSelectSequence([[LIST_ROW], [{ value: 1 }]]);

    const result = await listQuotes();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(1);
      expect(result.data.items[0].quoteNumber).toBe("OFF-2026-0001");
    }
  });

  it("rejects invalid filters", async () => {
    const result = await listQuotes({ pageSize: 5000 });

    expect(result.success).toBe(false);
  });
});

describe("getQuoteById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("rejects invalid UUID", async () => {
    const result = await getQuoteById("nope");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette offre n'existe pas");
    }
  });

  it("rejects quote not found", async () => {
    mockSelectSequence([[]]);

    const result = await getQuoteById(QUOTE_ID);

    expect(result.success).toBe(false);
  });
});

describe("deleteQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("deletes a draft quote", async () => {
    mockSelectSequence([[{ id: QUOTE_ID, status: "draft" }]]);
    mockDeleteChain();

    const result = await deleteQuote(QUOTE_ID);

    expect(result.success).toBe(true);
  });

  it("rejects deleting a sent quote", async () => {
    mockSelectSequence([[{ id: QUOTE_ID, status: "sent" }]]);

    const result = await deleteQuote(QUOTE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("brouillon");
    }
  });
});
