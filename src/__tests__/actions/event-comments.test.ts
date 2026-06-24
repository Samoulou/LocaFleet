import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  listEventComments,
  addEventComment,
  deleteEventComment,
} from "@/actions/event-comments";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const EVENT_ID = "e0000000-0000-4000-8000-000000000001";
const COMMENT_ID = "ec000000-0000-4000-8000-000000000001";

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

const EMPLOYEE_USER = {
  id: "d0000000-0000-4000-8000-000000000050",
  tenantId: TENANT_ID,
  role: "employee" as const,
  email: "employee@locafleet.ch",
  name: "Employee Test",
  isActive: true,
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
    for (const method of ["where", "innerJoin", "leftJoin", "orderBy"]) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    const from = vi.fn().mockReturnValue(chain);
    return { from } as never;
  });
}

function mockInsertChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const values = vi.fn().mockReturnValue({ returning });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values, returning };
}

function mockDeleteChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  vi.mocked(db.delete).mockReturnValue({ where } as never);
  return { where };
}

const COMMENT_ROW = {
  id: COMMENT_ID,
  body: "Heures supplémentaires : 2h",
  createdAt: new Date("2026-07-01T18:00:00"),
  authorUserId: EMPLOYEE_USER.id,
  authorName: "Employee Test",
};

// ============================================================================
// listEventComments
// ============================================================================

describe("listEventComments", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns comments for admin", async () => {
    // selects: 1 event exists, 2 comments
    mockSelectSequence([[{ id: EVENT_ID }], [COMMENT_ROW]]);

    const result = await listEventComments(EVENT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].authorName).toBe("Employee Test");
    }
  });

  it("hides comments of unassigned events from employees", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(EMPLOYEE_USER);
    // selects: 1 event exists, 2 assignment check → none
    mockSelectSequence([[{ id: EVENT_ID }], []]);

    const result = await listEventComments(EVENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cet événement n'existe pas");
    }
  });

  it("rejects invalid UUID", async () => {
    const result = await listEventComments("nope");

    expect(result.success).toBe(false);
  });

  it("rejects event not found", async () => {
    mockSelectSequence([[]]);

    const result = await listEventComments(EVENT_ID);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// addEventComment
// ============================================================================

describe("addEventComment", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
  });

  const VALID_INPUT = {
    eventId: EVENT_ID,
    body: "Supplément d'inventaire : 5 cartons",
  };

  it("agent can comment any event in tenant", async () => {
    // selects: 1 event exists (no assignment check for office roles)
    mockSelectSequence([[{ id: EVENT_ID }]]);
    const { values } = mockInsertChain([{ id: COMMENT_ID }]);

    const result = await addEventComment(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        eventId: EVENT_ID,
        authorUserId: AGENT_USER.id,
      })
    );
  });

  it("assigned employee can comment (heures supp., inventaire...)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(EMPLOYEE_USER);
    // selects: 1 event exists, 2 assignment check → assigned
    mockSelectSequence([[{ id: EVENT_ID }], [{ id: "assignment-1" }]]);
    mockInsertChain([{ id: COMMENT_ID }]);

    const result = await addEventComment(VALID_INPUT);

    expect(result.success).toBe(true);
  });

  it("unassigned employee cannot comment", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(EMPLOYEE_USER);
    mockSelectSequence([[{ id: EVENT_ID }], []]);

    const result = await addEventComment(VALID_INPUT);

    expect(result.success).toBe(false);
  });

  it("viewer cannot comment (read-only role)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(VIEWER_USER);

    const result = await addEventComment(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("rôle");
    }
  });

  it("rejects empty body", async () => {
    const result = await addEventComment({ eventId: EVENT_ID, body: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("vide");
    }
  });
});

// ============================================================================
// deleteEventComment
// ============================================================================

describe("deleteEventComment", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(AGENT_USER);
  });

  const OWN_COMMENT = {
    id: COMMENT_ID,
    eventId: EVENT_ID,
    authorUserId: AGENT_USER.id,
  };

  it("author can delete own comment", async () => {
    mockSelectSequence([[OWN_COMMENT]]);
    mockDeleteChain();

    const result = await deleteEventComment(COMMENT_ID);

    expect(result.success).toBe(true);
  });

  it("admin can delete any comment", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
    mockSelectSequence([[{ ...OWN_COMMENT, authorUserId: EMPLOYEE_USER.id }]]);
    mockDeleteChain();

    const result = await deleteEventComment(COMMENT_ID);

    expect(result.success).toBe(true);
  });

  it("non-author non-admin cannot delete", async () => {
    mockSelectSequence([[{ ...OWN_COMMENT, authorUserId: EMPLOYEE_USER.id }]]);

    const result = await deleteEventComment(COMMENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("auteur");
    }
  });

  it("rejects comment not found", async () => {
    mockSelectSequence([[]]);

    const result = await deleteEventComment(COMMENT_ID);

    expect(result.success).toBe(false);
  });
});
