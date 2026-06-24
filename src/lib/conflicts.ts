import { eq, and, or, lt, gt, ne, inArray, isNull } from "drizzle-orm";
import {
  rentalContracts,
  events,
  eventVehicles,
  eventEmployees,
} from "@/db/schema";
import type { DbLike } from "@/lib/number-utils";

// ============================================================================
// Conflict detection — shared by contracts (blocking) and events (warning)
//
// Overlap formula everywhere: existingStart < newEnd AND existingEnd > newStart
// ============================================================================

/** Contract statuses that occupy a vehicle (same set as createDraftContract). */
const BLOCKING_CONTRACT_STATUSES = [
  "draft",
  "approved",
  "pending_cg",
  "active",
] as const;

/** Event statuses that occupy vehicles/employees. */
const ACTIVE_EVENT_STATUSES = ["draft", "confirmed", "in_progress"] as const;

export type VehicleConflict = {
  vehicleId: string;
  source: "contract" | "event";
  /** Contract or event id */
  refId: string;
  /** CTR-... or EVT-... */
  refNumber: string;
  startDate: Date;
  endDate: Date;
};

export type EmployeeConflict = {
  userId: string;
  eventId: string;
  eventNumber: string;
  startDate: Date;
  endDate: Date;
};

export type VehicleConflictOptions = {
  /** Exclude this event's own bookings (when updating it or deriving a contract). */
  excludeEventId?: string;
  /** Exclude this contract (when updating it). */
  excludeContractId?: string;
  /**
   * Which booking sources to check. Contracts keep their historical
   * blocking behavior by checking ["contract"] only; events check both.
   */
  sources?: readonly ("contract" | "event")[];
};

export async function checkVehicleConflicts(
  dbx: DbLike,
  tenantId: string,
  vehicleIds: string[],
  startDate: Date,
  endDate: Date,
  options: VehicleConflictOptions = {}
): Promise<VehicleConflict[]> {
  if (vehicleIds.length === 0) return [];

  const sources = options.sources ?? ["contract", "event"];
  const conflicts: VehicleConflict[] = [];

  if (sources.includes("contract")) {
    const contractRows = await dbx
      .select({
        vehicleId: rentalContracts.vehicleId,
        refId: rentalContracts.id,
        refNumber: rentalContracts.contractNumber,
        startDate: rentalContracts.startDate,
        endDate: rentalContracts.endDate,
      })
      .from(rentalContracts)
      .where(
        and(
          inArray(rentalContracts.vehicleId, vehicleIds),
          eq(rentalContracts.tenantId, tenantId),
          or(
            ...BLOCKING_CONTRACT_STATUSES.map((status) =>
              eq(rentalContracts.status, status)
            )
          ),
          lt(rentalContracts.startDate, endDate),
          gt(rentalContracts.endDate, startDate),
          ...(options.excludeContractId
            ? [ne(rentalContracts.id, options.excludeContractId)]
            : []),
          // Contracts derived from the excluded event are its own booking.
          // eventId is nullable and NULL <> x is NULL in SQL, so keep NULLs
          // explicitly.
          ...(options.excludeEventId
            ? [
                or(
                  isNull(rentalContracts.eventId),
                  ne(rentalContracts.eventId, options.excludeEventId)
                ),
              ]
            : [])
        )
      );

    for (const row of contractRows) {
      conflicts.push({ ...row, source: "contract" });
    }
  }

  if (sources.includes("event")) {
    const eventRows = await dbx
      .select({
        vehicleId: eventVehicles.vehicleId,
        refId: events.id,
        refNumber: events.eventNumber,
        startDate: events.startDate,
        endDate: events.endDate,
      })
      .from(eventVehicles)
      .innerJoin(events, eq(eventVehicles.eventId, events.id))
      .where(
        and(
          inArray(eventVehicles.vehicleId, vehicleIds),
          eq(events.tenantId, tenantId),
          or(
            ...ACTIVE_EVENT_STATUSES.map((status) => eq(events.status, status))
          ),
          lt(events.startDate, endDate),
          gt(events.endDate, startDate),
          ...(options.excludeEventId
            ? [ne(events.id, options.excludeEventId)]
            : [])
        )
      );

    for (const row of eventRows) {
      conflicts.push({ ...row, source: "event" });
    }
  }

  return conflicts;
}

export type EmployeeConflictOptions = {
  excludeEventId?: string;
};

export async function checkEmployeeConflicts(
  dbx: DbLike,
  tenantId: string,
  userIds: string[],
  startDate: Date,
  endDate: Date,
  options: EmployeeConflictOptions = {}
): Promise<EmployeeConflict[]> {
  if (userIds.length === 0) return [];

  // Note: hour-type timeEntries join here when the time-tracking phase lands.
  const rows = await dbx
    .select({
      userId: eventEmployees.userId,
      eventId: events.id,
      eventNumber: events.eventNumber,
      startDate: events.startDate,
      endDate: events.endDate,
    })
    .from(eventEmployees)
    .innerJoin(events, eq(eventEmployees.eventId, events.id))
    .where(
      and(
        inArray(eventEmployees.userId, userIds),
        eq(events.tenantId, tenantId),
        or(...ACTIVE_EVENT_STATUSES.map((status) => eq(events.status, status))),
        lt(events.startDate, endDate),
        gt(events.endDate, startDate),
        ...(options.excludeEventId
          ? [ne(events.id, options.excludeEventId)]
          : [])
      )
    );

  return rows;
}
