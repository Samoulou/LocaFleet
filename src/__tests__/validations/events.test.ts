import { describe, it, expect } from "vitest";
import {
  createEventSchema,
  updateEventSchema,
  updateEventStatusSchema,
  checkEventConflictsSchema,
  addEventCommentSchema,
  listEventsFiltersSchema,
} from "@/lib/validations/events";

const FONCTION_ID = "550e8400-e29b-41d4-a716-446655440001";
const CLIENT_ID = "550e8400-e29b-41d4-a716-446655440002";
const EVENT_ID = "550e8400-e29b-41d4-a716-446655440003";
const VEHICLE_ID = "550e8400-e29b-41d4-a716-446655440004";
const USER_ID = "550e8400-e29b-41d4-a716-446655440005";

const VALID_INPUT = {
  fonctionId: FONCTION_ID,
  clientId: CLIENT_ID,
  title: "Déménagement Dupont",
  startDate: "2026-07-01T08:00:00",
  endDate: "2026-07-01T17:00:00",
  location: "Rue du Marché 12, Genève",
  destination: "Avenue de la Gare 3, Lausanne",
  agreedAmount: "1250.00",
  vehicleIds: [VEHICLE_ID],
  employees: [{ userId: USER_ID, role: "chauffeur" }],
};

// ============================================================================
// createEventSchema
// ============================================================================

describe("createEventSchema", () => {
  it("accepts a full valid event", () => {
    const result = createEventSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBeInstanceOf(Date);
      expect(result.data.agreedAmount).toBe(1250);
      expect(result.data.acknowledgeConflicts).toBe(false);
      expect(result.data.vehicleIds).toHaveLength(1);
      expect(result.data.employees[0].role).toBe("chauffeur");
    }
  });

  it("accepts minimal input (no vehicles, no employees)", () => {
    const result = createEventSchema.safeParse({
      fonctionId: FONCTION_ID,
      clientId: CLIENT_ID,
      title: "Location week-end",
      startDate: "2026-07-01T08:00:00",
      endDate: "2026-07-03T08:00:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleIds).toEqual([]);
      expect(result.data.employees).toEqual([]);
      expect(result.data.agreedAmount).toBeUndefined();
    }
  });

  it("accepts acknowledgeConflicts true (warn-not-forbid flow)", () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      acknowledgeConflicts: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.acknowledgeConflicts).toBe(true);
    }
  });

  it("rejects endDate before startDate with French message", () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      startDate: "2026-07-02T08:00:00",
      endDate: "2026-07-01T08:00:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "endDate");
      expect(error?.message).toBe(
        "La date de fin doit être après la date de début"
      );
    }
  });

  it("rejects duplicate vehicle ids", () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      vehicleIds: [VEHICLE_ID, VEHICLE_ID],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate employee ids", () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      employees: [
        { userId: USER_ID, role: "chauffeur" },
        { userId: USER_ID, role: "porteur" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "title");
      expect(error?.message).toBe("Le titre est requis");
    }
  });

  it("rejects invalid fonctionId", () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      fonctionId: "nope",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative agreedAmount", () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      agreedAmount: "-100",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date", () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      startDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateEventSchema
// ============================================================================

describe("updateEventSchema", () => {
  it("accepts valid input with id", () => {
    const result = updateEventSchema.safeParse({
      ...VALID_INPUT,
      id: EVENT_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = updateEventSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(false);
  });

  it("rejects invalid id", () => {
    const result = updateEventSchema.safeParse({
      ...VALID_INPUT,
      id: "nope",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateEventStatusSchema
// ============================================================================

describe("updateEventStatusSchema", () => {
  it("accepts all valid statuses", () => {
    for (const status of [
      "draft",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ]) {
      const result = updateEventStatusSchema.safeParse({
        id: EVENT_ID,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unknown status with French message", () => {
    const result = updateEventStatusSchema.safeParse({
      id: EVENT_ID,
      status: "archived",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "status");
      expect(error?.message).toBe("Le statut sélectionné est invalide");
    }
  });
});

// ============================================================================
// checkEventConflictsSchema
// ============================================================================

describe("checkEventConflictsSchema", () => {
  it("accepts minimal period input", () => {
    const result = checkEventConflictsSchema.safeParse({
      startDate: "2026-07-01T08:00:00",
      endDate: "2026-07-01T17:00:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleIds).toEqual([]);
      expect(result.data.employeeUserIds).toEqual([]);
    }
  });

  it("accepts full input with excludeEventId", () => {
    const result = checkEventConflictsSchema.safeParse({
      startDate: "2026-07-01T08:00:00",
      endDate: "2026-07-01T17:00:00",
      fonctionId: FONCTION_ID,
      vehicleIds: [VEHICLE_ID],
      employeeUserIds: [USER_ID],
      excludeEventId: EVENT_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid vehicle id", () => {
    const result = checkEventConflictsSchema.safeParse({
      startDate: "2026-07-01T08:00:00",
      endDate: "2026-07-01T17:00:00",
      vehicleIds: ["nope"],
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// addEventCommentSchema
// ============================================================================

describe("addEventCommentSchema", () => {
  it("accepts a valid comment", () => {
    const result = addEventCommentSchema.safeParse({
      eventId: EVENT_ID,
      body: "Supplément d'inventaire : 5 cartons en plus, 2 heures supplémentaires",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty body with French message", () => {
    const result = addEventCommentSchema.safeParse({
      eventId: EVENT_ID,
      body: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "body");
      expect(error?.message).toBe("Le commentaire ne peut pas être vide");
    }
  });

  it("rejects body longer than 2000 characters", () => {
    const result = addEventCommentSchema.safeParse({
      eventId: EVENT_ID,
      body: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid eventId", () => {
    const result = addEventCommentSchema.safeParse({
      eventId: "nope",
      body: "Test",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// listEventsFiltersSchema
// ============================================================================

describe("listEventsFiltersSchema", () => {
  it("applies defaults on empty input", () => {
    const result = listEventsFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.status).toBeUndefined();
    }
  });

  it("accepts filters", () => {
    const result = listEventsFiltersSchema.safeParse({
      status: "confirmed",
      fonctionId: FONCTION_ID,
      search: "EVT-2026",
      page: "2",
      pageSize: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it("rejects pageSize above 100", () => {
    const result = listEventsFiltersSchema.safeParse({ pageSize: 500 });
    expect(result.success).toBe(false);
  });

  it("rejects unknown status", () => {
    const result = listEventsFiltersSchema.safeParse({ status: "open" });
    expect(result.success).toBe(false);
  });
});
