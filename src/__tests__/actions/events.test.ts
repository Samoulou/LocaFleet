import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  createEvent,
  updateEventStatus,
  listEvents,
  getEventById,
  deleteEvent,
  checkEventConflicts,
} from "@/actions/events";

// ============================================================================
// Constants
// ============================================================================

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const FONCTION_ID = "f0000000-0000-4000-8000-000000000001";
const CLIENT_ID = "c0000000-0000-4000-8000-000000000001";
const EVENT_ID = "e0000000-0000-4000-8000-000000000001";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const EMPLOYEE_ID = "d0000000-0000-4000-8000-000000000050";

const ADMIN_USER = {
  id: "d0000000-0000-4000-8000-000000000001",
  tenantId: TENANT_ID,
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

const EMPLOYEE_USER = {
  id: EMPLOYEE_ID,
  tenantId: TENANT_ID,
  role: "employee" as const,
  email: "employee@locafleet.ch",
  name: "Employee Test",
  isActive: true,
};

const FONCTION_ROW = {
  id: FONCTION_ID,
  requiresEmployees: false,
  isActive: true,
};

const VALID_INPUT = {
  fonctionId: FONCTION_ID,
  clientId: CLIENT_ID,
  title: "Location week-end",
  startDate: "2026-07-01T08:00:00",
  endDate: "2026-07-03T08:00:00",
};

const CONTRACT_CONFLICT_ROW = {
  vehicleId: VEHICLE_ID,
  refId: "contract-1",
  refNumber: "CTR-2026-0001",
  startDate: new Date("2026-07-02T08:00:00"),
  endDate: new Date("2026-07-05T08:00:00"),
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
      "groupBy",
      "for",
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
// createEvent
// ============================================================================

describe("createEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("creates a minimal event → success with EVT number", async () => {
    // selects: 1 fonction, 2 client, 3 number scan (no assignments → no
    // existence/conflict queries)
    mockSelectSequence([[FONCTION_ROW], [{ id: CLIENT_ID }], []]);
    // inserts: 1 events, 2 auditLogs
    const { valuesCalls } = mockInsertSequence([[{ id: EVENT_ID }], []]);

    const result = await createEvent(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(EVENT_ID);
      expect(result.data.eventNumber).toMatch(/^EVT-\d{4}-0001$/);
    }
    expect(valuesCalls[0]).toMatchObject({
      tenantId: TENANT_ID,
      fonctionId: FONCTION_ID,
      clientId: CLIENT_ID,
      title: "Location week-end",
      createdByUserId: ADMIN_USER.id,
    });
  });

  it("returns conflicts (not created) when vehicle is double-booked and unacknowledged", async () => {
    // selects: 1 fonction, 2 client, 3 vehicles exist, 4 contract conflicts,
    // 5 event conflicts
    mockSelectSequence([
      [FONCTION_ROW],
      [{ id: CLIENT_ID }],
      [{ id: VEHICLE_ID }],
      [CONTRACT_CONFLICT_ROW],
      [],
    ]);
    const { insertMock } = mockInsertSequence([]);

    const result = await createEvent({
      ...VALID_INPUT,
      vehicleIds: [VEHICLE_ID],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("conflits");
      expect(result.conflicts?.vehicleConflicts).toHaveLength(1);
      expect(result.conflicts?.vehicleConflicts[0].source).toBe("contract");
      expect(result.conflicts?.missingEmployees).toBe(false);
    }
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates despite conflicts when acknowledgeConflicts is true (warn, never forbid)", async () => {
    // selects: 1 fonction, 2 client, 3 vehicles exist, 4 contract conflicts,
    // 5 event conflicts, 6 number scan
    mockSelectSequence([
      [FONCTION_ROW],
      [{ id: CLIENT_ID }],
      [{ id: VEHICLE_ID }],
      [CONTRACT_CONFLICT_ROW],
      [],
      [],
    ]);
    // inserts: 1 events, 2 eventVehicles, 3 auditLogs
    const { valuesCalls } = mockInsertSequence([[{ id: EVENT_ID }], [], []]);

    const result = await createEvent({
      ...VALID_INPUT,
      vehicleIds: [VEHICLE_ID],
      acknowledgeConflicts: true,
    });

    expect(result.success).toBe(true);
    expect(valuesCalls).toHaveLength(3);
    expect(valuesCalls[1]).toEqual([
      { eventId: EVENT_ID, vehicleId: VEHICLE_ID },
    ]);
  });

  it("warns when fonction requires employees and none assigned (déménagement rule)", async () => {
    // selects: 1 fonction (requiresEmployees), 2 client — no conflict queries
    // because no assignments
    mockSelectSequence([
      [{ ...FONCTION_ROW, requiresEmployees: true }],
      [{ id: CLIENT_ID }],
    ]);
    const { insertMock } = mockInsertSequence([]);

    const result = await createEvent(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.conflicts?.missingEmployees).toBe(true);
    }
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects when fonction does not exist", async () => {
    mockSelectSequence([[]]);

    const result = await createEvent(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cette fonction n'existe pas");
    }
  });

  it("rejects invalid input (endDate before startDate)", async () => {
    const result = await createEvent({
      ...VALID_INPUT,
      startDate: "2026-07-03T08:00:00",
      endDate: "2026-07-01T08:00:00",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("date de fin");
    }
  });

  it("rejects employee role (no events create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(EMPLOYEE_USER);

    const result = await createEvent(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createEvent(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await createEvent(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// checkEventConflicts
// ============================================================================

describe("checkEventConflicts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns vehicle conflicts and missingEmployees for déménagement", async () => {
    // selects: 1 fonction, 2 contract conflicts, 3 event conflicts
    mockSelectSequence([
      [{ requiresEmployees: true }],
      [CONTRACT_CONFLICT_ROW],
      [],
    ]);

    const result = await checkEventConflicts({
      startDate: "2026-07-01T08:00:00",
      endDate: "2026-07-03T08:00:00",
      fonctionId: FONCTION_ID,
      vehicleIds: [VEHICLE_ID],
      employeeUserIds: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleConflicts).toHaveLength(1);
      expect(result.data.missingEmployees).toBe(true);
    }
  });

  it("employee can run conflict checks (events read)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(EMPLOYEE_USER);
    mockSelectSequence([]);

    const result = await checkEventConflicts({
      startDate: "2026-07-01T08:00:00",
      endDate: "2026-07-03T08:00:00",
    });

    expect(result.success).toBe(true);
  });
});

// ============================================================================
// updateEventStatus
// ============================================================================

describe("updateEventStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("allows draft → confirmed", async () => {
    mockSelectSequence([[{ id: EVENT_ID, status: "draft" }]]);
    mockUpdateChain([{ id: EVENT_ID }]);
    mockInsertSequence([[]]);

    const result = await updateEventStatus({
      id: EVENT_ID,
      status: "confirmed",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("confirmed");
    }
  });

  it("rejects completed → draft (terminal state)", async () => {
    mockSelectSequence([[{ id: EVENT_ID, status: "completed" }]]);

    const result = await updateEventStatus({ id: EVENT_ID, status: "draft" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("transition");
    }
  });

  it("rejects event not found", async () => {
    mockSelectSequence([[]]);

    const result = await updateEventStatus({
      id: EVENT_ID,
      status: "confirmed",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cet événement n'existe pas");
    }
  });
});

// ============================================================================
// listEvents
// ============================================================================

describe("listEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  const LIST_ROW = {
    id: EVENT_ID,
    eventNumber: "EVT-2026-0001",
    title: "Déménagement Dupont",
    status: "confirmed",
    startDate: new Date("2026-07-01T08:00:00"),
    endDate: new Date("2026-07-01T17:00:00"),
    agreedAmount: "1250.00",
    fonctionName: "Déménagement",
    fonctionColor: "#D97706",
    clientFirstName: "Jean",
    clientLastName: "Dupont",
  };

  it("returns events with assignment counts for admin", async () => {
    // selects: 1 items, 2 total count, 3 vehicle counts, 4 employee counts
    mockSelectSequence([
      [LIST_ROW],
      [{ value: 1 }],
      [{ eventId: EVENT_ID, value: 2 }],
      [{ eventId: EVENT_ID, value: 3 }],
    ]);

    const result = await listEvents();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(1);
      expect(result.data.items[0].vehicleCount).toBe(2);
      expect(result.data.items[0].employeeCount).toBe(3);
      expect(result.data.items[0].fonctionName).toBe("Déménagement");
    }
  });

  it("employee with no assignments gets an empty list (row scoping)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(EMPLOYEE_USER);
    // selects: 1 assigned event ids → none
    mockSelectSequence([[]]);

    const result = await listEvents();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toEqual([]);
      expect(result.data.total).toBe(0);
    }
  });

  it("rejects invalid filters", async () => {
    const result = await listEvents({ pageSize: 5000 });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// getEventById
// ============================================================================

describe("getEventById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("hides unassigned events from employees (no existence leak)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(EMPLOYEE_USER);
    // selects: 1 assignment check → none
    mockSelectSequence([[]]);

    const result = await getEventById(EVENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cet événement n'existe pas");
    }
  });

  it("rejects invalid UUID", async () => {
    const result = await getEventById("not-a-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cet événement n'existe pas");
    }
  });

  it("rejects event not found", async () => {
    mockSelectSequence([[]]);

    const result = await getEventById(EVENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cet événement n'existe pas");
    }
  });
});

// ============================================================================
// deleteEvent
// ============================================================================

describe("deleteEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("deletes a draft event", async () => {
    mockSelectSequence([[{ id: EVENT_ID, status: "draft" }]]);
    mockDeleteChain();

    const result = await deleteEvent(EVENT_ID);

    expect(result.success).toBe(true);
  });

  it("rejects deleting a confirmed event (cancel instead)", async () => {
    mockSelectSequence([[{ id: EVENT_ID, status: "confirmed" }]]);

    const result = await deleteEvent(EVENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("brouillon");
    }
  });

  it("rejects event not found", async () => {
    mockSelectSequence([[]]);

    const result = await deleteEvent(EVENT_ID);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Form helper actions
// ============================================================================

describe("event form helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("getFonctionsForEventForm returns active fonctions", async () => {
    const { getFonctionsForEventForm } = await import("@/actions/events");
    mockSelectSequence([
      [
        {
          id: FONCTION_ID,
          name: "Déménagement",
          color: "#D97706",
          requiresEmployees: true,
          allowsContract: false,
        },
      ],
    ]);

    const result = await getFonctionsForEventForm();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].name).toBe("Déménagement");
    }
  });

  it("getVehiclesForEventForm returns vehicles", async () => {
    const { getVehiclesForEventForm } = await import("@/actions/events");
    mockSelectSequence([
      [
        {
          id: VEHICLE_ID,
          brand: "Renault",
          model: "Master",
          plateNumber: "GE 12345",
        },
      ],
    ]);

    const result = await getVehiclesForEventForm();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].plateNumber).toBe("GE 12345");
    }
  });

  it("getEmployeesForEventForm returns active users", async () => {
    const { getEmployeesForEventForm } = await import("@/actions/events");
    mockSelectSequence([
      [{ id: EMPLOYEE_ID, name: "Marco", role: "employee" }],
    ]);

    const result = await getEmployeesForEventForm();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].name).toBe("Marco");
    }
  });

  it("form helpers reject unauthenticated users", async () => {
    const { getFonctionsForEventForm } = await import("@/actions/events");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getFonctionsForEventForm();

    expect(result.success).toBe(false);
  });
});
