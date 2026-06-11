"use server";

import {
  eq,
  and,
  or,
  desc,
  asc,
  count,
  ilike,
  inArray,
  isNull,
} from "drizzle-orm";
import { db } from "@/db";
import {
  events,
  eventVehicles,
  eventEmployees,
  fonctions,
  clients,
  vehicles,
  users,
  rentalContracts,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  createEventSchema,
  updateEventSchema,
  updateEventStatusSchema,
  checkEventConflictsSchema,
  listEventsFiltersSchema,
} from "@/lib/validations/events";
import {
  checkVehicleConflicts,
  checkEmployeeConflicts,
  type VehicleConflict,
  type EmployeeConflict,
} from "@/lib/conflicts";
import { generateNextEventNumber } from "@/lib/number-utils";
import { createAuditLog } from "@/actions/audit-logs";
import { getZodErrorMessage } from "@/lib/validations/utils";
import { revalidatePath } from "next/cache";
import type { ActionResult, EventStatus, EventBillingStatus } from "@/types";

// ============================================================================
// Types
// ============================================================================

/** Business logic error (not auth) — aborts the flow with a French message. */
class EventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventError";
  }
}

export type EventConflicts = {
  vehicleConflicts: VehicleConflict[];
  employeeConflicts: EmployeeConflict[];
  /** fonction.requiresEmployees is set but no employee is assigned */
  missingEmployees: boolean;
};

// "use server" files may only export async functions, so this stays internal.
// The UI detects the conflict case via the `conflicts` field, not the message.
const CONFLICTS_ERROR_MESSAGE =
  "Des conflits ont été détectés. Vous pouvez valider malgré tout.";

/**
 * Like ActionResult, but mutations can carry the detected conflicts so the
 * UI opens a confirmation dialog and resubmits with acknowledgeConflicts.
 */
export type EventMutationResult =
  | { success: true; data: { id: string; eventNumber: string } }
  | { success: false; error: string; conflicts?: EventConflicts };

export type EventListItem = {
  id: string;
  eventNumber: string;
  title: string;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  agreedAmount: string | null;
  fonctionName: string;
  fonctionColor: string | null;
  clientFirstName: string;
  clientLastName: string;
  vehicleCount: number;
  employeeCount: number;
};

export type EventDetail = {
  id: string;
  eventNumber: string;
  title: string;
  status: EventStatus;
  billingStatus: EventBillingStatus;
  startDate: Date;
  endDate: Date;
  location: string | null;
  destination: string | null;
  description: string | null;
  notes: string | null;
  agreedAmount: string | null;
  invoiceId: string | null;
  createdAt: Date;
  fonction: {
    id: string;
    name: string;
    color: string | null;
    requiresEmployees: boolean;
    allowsContract: boolean;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    phone: string;
  };
  vehicles: {
    id: string;
    vehicleId: string;
    brand: string;
    model: string;
    plateNumber: string;
  }[];
  employees: {
    id: string;
    userId: string;
    name: string;
    role: string | null;
  }[];
  contracts: {
    id: string;
    contractNumber: string;
    status: string;
  }[];
};

// Event lifecycle state machine (mirrors the invoices ALLOWED_TRANSITIONS
// pattern). completed/cancelled are terminal.
const ALLOWED_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  draft: ["confirmed", "in_progress", "cancelled"],
  confirmed: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// Statuses that still allow editing dates/assignments
const EDITABLE_STATUSES: readonly EventStatus[] = [
  "draft",
  "confirmed",
  "in_progress",
];

// ============================================================================
// Internal helpers
// ============================================================================

async function detectEventConflicts(params: {
  tenantId: string;
  vehicleIds: string[];
  employeeUserIds: string[];
  startDate: Date;
  endDate: Date;
  requiresEmployees: boolean;
  excludeEventId?: string;
}): Promise<EventConflicts> {
  // Sequential on purpose: deterministic query order (vehicles: contracts
  // then events, then employees) keeps behavior predictable and testable.
  const vehicleConflicts = await checkVehicleConflicts(
    db,
    params.tenantId,
    params.vehicleIds,
    params.startDate,
    params.endDate,
    { excludeEventId: params.excludeEventId }
  );
  const employeeConflicts = await checkEmployeeConflicts(
    db,
    params.tenantId,
    params.employeeUserIds,
    params.startDate,
    params.endDate,
    { excludeEventId: params.excludeEventId }
  );

  return {
    vehicleConflicts,
    employeeConflicts,
    missingEmployees:
      params.requiresEmployees && params.employeeUserIds.length === 0,
  };
}

function hasConflicts(conflicts: EventConflicts): boolean {
  return (
    conflicts.vehicleConflicts.length > 0 ||
    conflicts.employeeConflicts.length > 0 ||
    conflicts.missingEmployees
  );
}

/** Fonction must exist in tenant; returns its behavior flags. */
async function requireFonction(tenantId: string, fonctionId: string) {
  const [fonction] = await db
    .select({
      id: fonctions.id,
      requiresEmployees: fonctions.requiresEmployees,
      isActive: fonctions.isActive,
    })
    .from(fonctions)
    .where(and(eq(fonctions.id, fonctionId), eq(fonctions.tenantId, tenantId)));

  if (!fonction) {
    throw new EventError("Cette fonction n'existe pas");
  }
  if (!fonction.isActive) {
    throw new EventError("Cette fonction est désactivée");
  }
  return fonction;
}

/** Client, vehicles and employees must all exist in the tenant. */
async function verifyEventReferences(params: {
  tenantId: string;
  clientId: string;
  vehicleIds: string[];
  employeeUserIds: string[];
}) {
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, params.clientId),
        eq(clients.tenantId, params.tenantId),
        isNull(clients.deletedAt)
      )
    );

  if (!client) {
    throw new EventError("Ce client n'existe pas");
  }

  if (params.vehicleIds.length > 0) {
    const vehicleRows = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(
        and(
          inArray(vehicles.id, params.vehicleIds),
          eq(vehicles.tenantId, params.tenantId),
          isNull(vehicles.deletedAt)
        )
      );

    if (vehicleRows.length !== params.vehicleIds.length) {
      throw new EventError("Un des véhicules sélectionnés n'existe pas");
    }
  }

  if (params.employeeUserIds.length > 0) {
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          inArray(users.id, params.employeeUserIds),
          eq(users.tenantId, params.tenantId),
          eq(users.isActive, true)
        )
      );

    if (userRows.length !== params.employeeUserIds.length) {
      throw new EventError("Un des employés sélectionnés n'existe pas");
    }
  }
}

/** Employees only see events they are assigned to. */
async function isEmployeeAssigned(
  eventId: string,
  userId: string
): Promise<boolean> {
  const [assignment] = await db
    .select({ id: eventEmployees.id })
    .from(eventEmployees)
    .where(
      and(
        eq(eventEmployees.eventId, eventId),
        eq(eventEmployees.userId, userId)
      )
    );
  return !!assignment;
}

function handleEventActionError(
  err: unknown,
  context: string
): { success: false; error: string } {
  if (err instanceof AuthorizationError || err instanceof EventError) {
    return { success: false, error: err.message };
  }
  console.error(
    `${context} error:`,
    err instanceof Error ? err.message : "Unknown error"
  );
  return { success: false, error: "Une erreur est survenue" };
}

// ============================================================================
// checkEventConflicts — live warnings for the event form
// ============================================================================

export async function checkEventConflicts(
  input: unknown
): Promise<ActionResult<EventConflicts>> {
  try {
    const currentUser = await requirePermission("events", "read");

    const parsed = checkEventConflictsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const data = parsed.data;

    let requiresEmployees = false;
    if (data.fonctionId) {
      const [fonction] = await db
        .select({ requiresEmployees: fonctions.requiresEmployees })
        .from(fonctions)
        .where(
          and(
            eq(fonctions.id, data.fonctionId),
            eq(fonctions.tenantId, currentUser.tenantId)
          )
        );
      requiresEmployees = fonction?.requiresEmployees ?? false;
    }

    const conflicts = await detectEventConflicts({
      tenantId: currentUser.tenantId,
      vehicleIds: data.vehicleIds,
      employeeUserIds: data.employeeUserIds,
      startDate: data.startDate,
      endDate: data.endDate,
      requiresEmployees,
      excludeEventId: data.excludeEventId,
    });

    return { success: true, data: conflicts };
  } catch (err) {
    return handleEventActionError(err, "checkEventConflicts");
  }
}

// ============================================================================
// createEvent
// ============================================================================

export async function createEvent(
  input: unknown
): Promise<EventMutationResult> {
  try {
    const currentUser = await requirePermission("events", "create");

    const parsed = createEventSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const data = parsed.data;
    const employeeUserIds = data.employees.map((e) => e.userId);

    const fonction = await requireFonction(
      currentUser.tenantId,
      data.fonctionId
    );

    await verifyEventReferences({
      tenantId: currentUser.tenantId,
      clientId: data.clientId,
      vehicleIds: data.vehicleIds,
      employeeUserIds,
    });

    // Warn, never forbid: unacknowledged conflicts are returned to the UI,
    // which confirms and resubmits with acknowledgeConflicts = true.
    const conflicts = await detectEventConflicts({
      tenantId: currentUser.tenantId,
      vehicleIds: data.vehicleIds,
      employeeUserIds,
      startDate: data.startDate,
      endDate: data.endDate,
      requiresEmployees: fonction.requiresEmployees,
    });

    if (hasConflicts(conflicts) && !data.acknowledgeConflicts) {
      return { success: false, error: CONFLICTS_ERROR_MESSAGE, conflicts };
    }

    let eventId = "";
    let eventNumber = "";

    await db.transaction(async (tx) => {
      eventNumber = await generateNextEventNumber(currentUser.tenantId, tx);

      const [created] = await tx
        .insert(events)
        .values({
          tenantId: currentUser.tenantId,
          eventNumber,
          fonctionId: data.fonctionId,
          clientId: data.clientId,
          title: data.title,
          startDate: data.startDate,
          endDate: data.endDate,
          location: data.location ?? null,
          destination: data.destination ?? null,
          description: data.description ?? null,
          notes: data.notes ?? null,
          agreedAmount: data.agreedAmount?.toString() ?? null,
          createdByUserId: currentUser.id,
        })
        .returning({ id: events.id });

      eventId = created.id;

      if (data.vehicleIds.length > 0) {
        await tx.insert(eventVehicles).values(
          data.vehicleIds.map((vehicleId) => ({
            eventId: created.id,
            vehicleId,
          }))
        );
      }

      if (data.employees.length > 0) {
        await tx.insert(eventEmployees).values(
          data.employees.map((employee) => ({
            eventId: created.id,
            userId: employee.userId,
            role: employee.role ?? null,
          }))
        );
      }

      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "event.created",
          entityType: "event",
          entityId: created.id,
          metadata: {
            eventNumber,
            acknowledgedConflicts: hasConflicts(conflicts),
          },
        },
        tx
      );
    });

    revalidatePath("/events");
    revalidatePath("/planning");

    return { success: true, data: { id: eventId, eventNumber } };
  } catch (err) {
    return handleEventActionError(err, "createEvent");
  }
}

// ============================================================================
// updateEvent — full replace of fields and assignments
// ============================================================================

export async function updateEvent(
  input: unknown
): Promise<EventMutationResult> {
  try {
    const currentUser = await requirePermission("events", "update");

    const parsed = updateEventSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const { id, ...data } = parsed.data;
    const employeeUserIds = data.employees.map((e) => e.userId);

    const [existing] = await db
      .select({
        id: events.id,
        status: events.status,
        eventNumber: events.eventNumber,
      })
      .from(events)
      .where(and(eq(events.id, id), eq(events.tenantId, currentUser.tenantId)));

    if (!existing) {
      return { success: false, error: "Cet événement n'existe pas" };
    }

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return {
        success: false,
        error:
          "Cet événement est terminé ou annulé et ne peut plus être modifié",
      };
    }

    const fonction = await requireFonction(
      currentUser.tenantId,
      data.fonctionId
    );

    await verifyEventReferences({
      tenantId: currentUser.tenantId,
      clientId: data.clientId,
      vehicleIds: data.vehicleIds,
      employeeUserIds,
    });

    const conflicts = await detectEventConflicts({
      tenantId: currentUser.tenantId,
      vehicleIds: data.vehicleIds,
      employeeUserIds,
      startDate: data.startDate,
      endDate: data.endDate,
      requiresEmployees: fonction.requiresEmployees,
      excludeEventId: id,
    });

    if (hasConflicts(conflicts) && !data.acknowledgeConflicts) {
      return { success: false, error: CONFLICTS_ERROR_MESSAGE, conflicts };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(events)
        .set({
          fonctionId: data.fonctionId,
          clientId: data.clientId,
          title: data.title,
          startDate: data.startDate,
          endDate: data.endDate,
          location: data.location ?? null,
          destination: data.destination ?? null,
          description: data.description ?? null,
          notes: data.notes ?? null,
          agreedAmount: data.agreedAmount?.toString() ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(eq(events.id, id), eq(events.tenantId, currentUser.tenantId))
        );

      // Full replace of assignments
      await tx.delete(eventVehicles).where(eq(eventVehicles.eventId, id));
      await tx.delete(eventEmployees).where(eq(eventEmployees.eventId, id));

      if (data.vehicleIds.length > 0) {
        await tx
          .insert(eventVehicles)
          .values(
            data.vehicleIds.map((vehicleId) => ({ eventId: id, vehicleId }))
          );
      }

      if (data.employees.length > 0) {
        await tx.insert(eventEmployees).values(
          data.employees.map((employee) => ({
            eventId: id,
            userId: employee.userId,
            role: employee.role ?? null,
          }))
        );
      }

      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "event.updated",
          entityType: "event",
          entityId: id,
          metadata: {
            eventNumber: existing.eventNumber,
            acknowledgedConflicts: hasConflicts(conflicts),
          },
        },
        tx
      );
    });

    revalidatePath("/events");
    revalidatePath(`/events/${id}`);
    revalidatePath("/planning");

    return {
      success: true,
      data: { id, eventNumber: existing.eventNumber },
    };
  } catch (err) {
    return handleEventActionError(err, "updateEvent");
  }
}

// ============================================================================
// updateEventStatus — state machine
// ============================================================================

export async function updateEventStatus(
  input: unknown
): Promise<ActionResult<{ status: EventStatus }>> {
  try {
    const currentUser = await requirePermission("events", "update");

    const parsed = updateEventStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const { id, status: targetStatus } = parsed.data;

    const [existing] = await db
      .select({ id: events.id, status: events.status })
      .from(events)
      .where(and(eq(events.id, id), eq(events.tenantId, currentUser.tenantId)));

    if (!existing) {
      return { success: false, error: "Cet événement n'existe pas" };
    }

    if (!ALLOWED_TRANSITIONS[existing.status].includes(targetStatus)) {
      return {
        success: false,
        error: "Cette transition de statut n'est pas autorisée",
      };
    }

    // NOTE billing phase: when targetStatus === "completed", route the event
    // by clients.invoicingMode (manual queue / monthly batch / automatic
    // invoice). Lands with the billing-queue module.
    await db
      .update(events)
      .set({ status: targetStatus, updatedAt: new Date() })
      .where(and(eq(events.id, id), eq(events.tenantId, currentUser.tenantId)));

    await createAuditLog({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: "event.status_changed",
      entityType: "event",
      entityId: id,
      changes: { from: existing.status, to: targetStatus },
    });

    revalidatePath("/events");
    revalidatePath(`/events/${id}`);
    revalidatePath("/planning");

    return { success: true, data: { status: targetStatus } };
  } catch (err) {
    return handleEventActionError(err, "updateEventStatus");
  }
}

// ============================================================================
// listEvents
// ============================================================================

export type ListEventsResult = {
  items: EventListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listEvents(
  input?: unknown
): Promise<ActionResult<ListEventsResult>> {
  try {
    const currentUser = await requirePermission("events", "read");

    const parsed = listEventsFiltersSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const filters = parsed.data;

    const conditions = [eq(events.tenantId, currentUser.tenantId)];

    if (filters.status) {
      conditions.push(eq(events.status, filters.status));
    }
    if (filters.fonctionId) {
      conditions.push(eq(events.fonctionId, filters.fonctionId));
    }
    if (filters.clientId) {
      conditions.push(eq(events.clientId, filters.clientId));
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      const searchCondition = or(
        ilike(events.title, term),
        ilike(events.eventNumber, term)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    // Employees only see events they are assigned to
    if (currentUser.role === "employee") {
      const assignedRows = await db
        .select({ eventId: eventEmployees.eventId })
        .from(eventEmployees)
        .where(eq(eventEmployees.userId, currentUser.id));

      if (assignedRows.length === 0) {
        return {
          success: true,
          data: {
            items: [],
            total: 0,
            page: filters.page,
            pageSize: filters.pageSize,
          },
        };
      }

      conditions.push(
        inArray(
          events.id,
          assignedRows.map((row) => row.eventId)
        )
      );
    }

    const whereClause = and(...conditions);

    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: events.id,
          eventNumber: events.eventNumber,
          title: events.title,
          status: events.status,
          startDate: events.startDate,
          endDate: events.endDate,
          agreedAmount: events.agreedAmount,
          fonctionName: fonctions.name,
          fonctionColor: fonctions.color,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
        })
        .from(events)
        .innerJoin(fonctions, eq(events.fonctionId, fonctions.id))
        .innerJoin(clients, eq(events.clientId, clients.id))
        .where(whereClause)
        .orderBy(desc(events.startDate))
        .limit(filters.pageSize)
        .offset((filters.page - 1) * filters.pageSize),
      db.select({ value: count() }).from(events).where(whereClause),
    ]);

    // Assignment counts for the page's events (2 grouped queries)
    const eventIds = items.map((e) => e.id);
    const vehicleCounts = new Map<string, number>();
    const employeeCounts = new Map<string, number>();

    if (eventIds.length > 0) {
      const [vehicleRows, employeeRows] = await Promise.all([
        db
          .select({ eventId: eventVehicles.eventId, value: count() })
          .from(eventVehicles)
          .where(inArray(eventVehicles.eventId, eventIds))
          .groupBy(eventVehicles.eventId),
        db
          .select({ eventId: eventEmployees.eventId, value: count() })
          .from(eventEmployees)
          .where(inArray(eventEmployees.eventId, eventIds))
          .groupBy(eventEmployees.eventId),
      ]);
      for (const row of vehicleRows) vehicleCounts.set(row.eventId, row.value);
      for (const row of employeeRows)
        employeeCounts.set(row.eventId, row.value);
    }

    return {
      success: true,
      data: {
        items: items.map((item) => ({
          ...item,
          vehicleCount: vehicleCounts.get(item.id) ?? 0,
          employeeCount: employeeCounts.get(item.id) ?? 0,
        })),
        total: totalRows[0]?.value ?? 0,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    };
  } catch (err) {
    return handleEventActionError(err, "listEvents");
  }
}

// ============================================================================
// getEventById
// ============================================================================

export async function getEventById(
  id: string
): Promise<ActionResult<EventDetail>> {
  try {
    const currentUser = await requirePermission("events", "read");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return { success: false, error: "Cet événement n'existe pas" };
    }

    // Employees only see their assigned events (no existence leak)
    if (
      currentUser.role === "employee" &&
      !(await isEmployeeAssigned(id, currentUser.id))
    ) {
      return { success: false, error: "Cet événement n'existe pas" };
    }

    const [row] = await db
      .select({
        id: events.id,
        eventNumber: events.eventNumber,
        title: events.title,
        status: events.status,
        billingStatus: events.billingStatus,
        startDate: events.startDate,
        endDate: events.endDate,
        location: events.location,
        destination: events.destination,
        description: events.description,
        notes: events.notes,
        agreedAmount: events.agreedAmount,
        invoiceId: events.invoiceId,
        createdAt: events.createdAt,
        fonctionId: fonctions.id,
        fonctionName: fonctions.name,
        fonctionColor: fonctions.color,
        fonctionRequiresEmployees: fonctions.requiresEmployees,
        fonctionAllowsContract: fonctions.allowsContract,
        clientId: clients.id,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientCompanyName: clients.companyName,
        clientPhone: clients.phone,
      })
      .from(events)
      .innerJoin(fonctions, eq(events.fonctionId, fonctions.id))
      .innerJoin(clients, eq(events.clientId, clients.id))
      .where(and(eq(events.id, id), eq(events.tenantId, currentUser.tenantId)));

    if (!row) {
      return { success: false, error: "Cet événement n'existe pas" };
    }

    const [vehicleRows, employeeRows, contractRows] = await Promise.all([
      db
        .select({
          id: eventVehicles.id,
          vehicleId: vehicles.id,
          brand: vehicles.brand,
          model: vehicles.model,
          plateNumber: vehicles.plateNumber,
        })
        .from(eventVehicles)
        .innerJoin(vehicles, eq(eventVehicles.vehicleId, vehicles.id))
        .where(eq(eventVehicles.eventId, id))
        .orderBy(asc(vehicles.brand)),
      db
        .select({
          id: eventEmployees.id,
          userId: users.id,
          name: users.name,
          role: eventEmployees.role,
        })
        .from(eventEmployees)
        .innerJoin(users, eq(eventEmployees.userId, users.id))
        .where(eq(eventEmployees.eventId, id))
        .orderBy(asc(users.name)),
      db
        .select({
          id: rentalContracts.id,
          contractNumber: rentalContracts.contractNumber,
          status: rentalContracts.status,
        })
        .from(rentalContracts)
        .where(
          and(
            eq(rentalContracts.eventId, id),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        )
        .orderBy(desc(rentalContracts.createdAt)),
    ]);

    return {
      success: true,
      data: {
        id: row.id,
        eventNumber: row.eventNumber,
        title: row.title,
        status: row.status,
        billingStatus: row.billingStatus,
        startDate: row.startDate,
        endDate: row.endDate,
        location: row.location,
        destination: row.destination,
        description: row.description,
        notes: row.notes,
        agreedAmount: row.agreedAmount,
        invoiceId: row.invoiceId,
        createdAt: row.createdAt,
        fonction: {
          id: row.fonctionId,
          name: row.fonctionName,
          color: row.fonctionColor,
          requiresEmployees: row.fonctionRequiresEmployees,
          allowsContract: row.fonctionAllowsContract,
        },
        client: {
          id: row.clientId,
          firstName: row.clientFirstName,
          lastName: row.clientLastName,
          companyName: row.clientCompanyName,
          phone: row.clientPhone,
        },
        vehicles: vehicleRows,
        employees: employeeRows,
        contracts: contractRows,
      },
    };
  } catch (err) {
    return handleEventActionError(err, "getEventById");
  }
}

// ============================================================================
// deleteEvent — drafts only
// ============================================================================

export async function deleteEvent(id: string): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("events", "delete");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return { success: false, error: "Cet événement n'existe pas" };
    }

    const [existing] = await db
      .select({ id: events.id, status: events.status })
      .from(events)
      .where(and(eq(events.id, id), eq(events.tenantId, currentUser.tenantId)));

    if (!existing) {
      return { success: false, error: "Cet événement n'existe pas" };
    }

    if (existing.status !== "draft") {
      return {
        success: false,
        error:
          "Seul un événement en brouillon peut être supprimé. Annulez-le plutôt.",
      };
    }

    // Junction rows cascade with the event
    await db
      .delete(events)
      .where(and(eq(events.id, id), eq(events.tenantId, currentUser.tenantId)));

    revalidatePath("/events");
    revalidatePath("/planning");

    return { success: true, data: undefined };
  } catch (err) {
    return handleEventActionError(err, "deleteEvent");
  }
}

// ============================================================================
// Form helpers — dropdown data
// ============================================================================

export type FonctionSelectItem = {
  id: string;
  name: string;
  color: string | null;
  requiresEmployees: boolean;
  allowsContract: boolean;
};

/** Active fonctions for the event form (events permission, not settings). */
export async function getFonctionsForEventForm(): Promise<
  ActionResult<FonctionSelectItem[]>
> {
  try {
    const currentUser = await requirePermission("events", "read");

    const result = await db
      .select({
        id: fonctions.id,
        name: fonctions.name,
        color: fonctions.color,
        requiresEmployees: fonctions.requiresEmployees,
        allowsContract: fonctions.allowsContract,
      })
      .from(fonctions)
      .where(
        and(
          eq(fonctions.tenantId, currentUser.tenantId),
          eq(fonctions.isActive, true)
        )
      )
      .orderBy(asc(fonctions.sortOrder), asc(fonctions.name));

    return { success: true, data: result };
  } catch (err) {
    return handleEventActionError(err, "getFonctionsForEventForm");
  }
}

export type VehicleSelectItem = {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
};

/** Assignable vehicles for the event form (events permission). */
export async function getVehiclesForEventForm(): Promise<
  ActionResult<VehicleSelectItem[]>
> {
  try {
    const currentUser = await requirePermission("events", "read");

    const result = await db
      .select({
        id: vehicles.id,
        brand: vehicles.brand,
        model: vehicles.model,
        plateNumber: vehicles.plateNumber,
      })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.tenantId, currentUser.tenantId),
          isNull(vehicles.deletedAt)
        )
      )
      .orderBy(asc(vehicles.brand), asc(vehicles.model));

    return { success: true, data: result };
  } catch (err) {
    return handleEventActionError(err, "getVehiclesForEventForm");
  }
}

export type EmployeeSelectItem = {
  id: string;
  name: string;
  role: string;
};

/** Active users assignable to an event (any role can be assigned). */
export async function getEmployeesForEventForm(): Promise<
  ActionResult<EmployeeSelectItem[]>
> {
  try {
    const currentUser = await requirePermission("events", "read");

    const result = await db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(
        and(eq(users.tenantId, currentUser.tenantId), eq(users.isActive, true))
      )
      .orderBy(asc(users.name));

    return { success: true, data: result };
  } catch (err) {
    return handleEventActionError(err, "getEmployeesForEventForm");
  }
}
