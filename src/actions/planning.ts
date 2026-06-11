"use server";

import { eq, and, gte, lte, sql, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  rentalContracts,
  vehicles,
  clients,
  vehicleCategories,
  maintenanceRecords,
  events,
  eventVehicles,
  fonctions,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import type { ActionResult } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type PlanningContract = {
  id: string;
  contractNumber: string;
  clientName: string;
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  startDate: Date;
  endDate: Date;
  status: string;
  totalAmount: string;
};

export type PlanningMaintenance = {
  id: string;
  type: string;
  status: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
};

export type PlanningEvent = {
  id: string;
  eventNumber: string;
  title: string;
  vehicleId: string;
  clientName: string;
  fonctionName: string;
  fonctionColor: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
};

export type PlanningVehicle = {
  id: string;
  name: string;
  plateNumber: string;
  status: string;
  dailyRate: number;
  categoryName: string | null;
  contracts: PlanningContract[];
  maintenance: PlanningMaintenance[];
  events: PlanningEvent[];
};

export type PlanningData = {
  vehicles: PlanningVehicle[];
  startDate: string;
  endDate: string;
};

// ============================================================================
// getPlanningData
// ============================================================================

export async function getPlanningData(
  startDateStr: string,
  endDateStr: string
): Promise<ActionResult<PlanningData>> {
  try {
    const currentUser = await requirePermission("contracts", "read");
    const tenantId = currentUser.tenantId;

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Fetch all vehicles for tenant
    const vehicleRows = await db
      .select({
        id: vehicles.id,
        brand: vehicles.brand,
        model: vehicles.model,
        plateNumber: vehicles.plateNumber,
        status: vehicles.status,
        dailyRateOverride: vehicles.dailyRateOverride,
        categoryName: vehicleCategories.name,
        categoryDailyRate: vehicleCategories.dailyRate,
      })
      .from(vehicles)
      .leftJoin(
        vehicleCategories,
        eq(vehicles.categoryId, vehicleCategories.id)
      )
      .where(
        and(
          eq(vehicles.tenantId, tenantId),
          sql`${vehicles.status} != 'out_of_service'`
        )
      )
      .orderBy(vehicles.brand, vehicles.model);

    // Fetch contracts overlapping the date range
    const contractRows = await db
      .select({
        id: rentalContracts.id,
        contractNumber: rentalContracts.contractNumber,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        vehicleId: rentalContracts.vehicleId,
        startDate: rentalContracts.startDate,
        endDate: rentalContracts.endDate,
        status: rentalContracts.status,
        totalAmount: rentalContracts.totalAmount,
      })
      .from(rentalContracts)
      .innerJoin(clients, eq(rentalContracts.clientId, clients.id))
      .where(
        and(
          eq(rentalContracts.tenantId, tenantId),
          gte(rentalContracts.endDate, startDate),
          lte(rentalContracts.startDate, endDate),
          sql`${rentalContracts.status} IN ('draft', 'approved', 'pending_cg', 'active')`
        )
      );

    // Fetch maintenance records overlapping the date range
    const maintenanceRows = await db
      .select({
        id: maintenanceRecords.id,
        vehicleId: maintenanceRecords.vehicleId,
        type: maintenanceRecords.type,
        status: maintenanceRecords.status,
        description: maintenanceRecords.description,
        startDate: maintenanceRecords.startDate,
        endDate: maintenanceRecords.endDate,
      })
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.tenantId, tenantId),
          lte(maintenanceRecords.startDate, endDate),
          or(
            isNull(maintenanceRecords.endDate),
            gte(maintenanceRecords.endDate, startDate)
          ),
          sql`${maintenanceRecords.status} IN ('open', 'in_progress')`
        )
      );

    // Fetch events (via vehicle assignments) overlapping the date range
    const eventRows = await db
      .select({
        id: events.id,
        eventNumber: events.eventNumber,
        title: events.title,
        vehicleId: eventVehicles.vehicleId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        fonctionName: fonctions.name,
        fonctionColor: fonctions.color,
        startDate: events.startDate,
        endDate: events.endDate,
        status: events.status,
      })
      .from(eventVehicles)
      .innerJoin(events, eq(eventVehicles.eventId, events.id))
      .innerJoin(fonctions, eq(events.fonctionId, fonctions.id))
      .innerJoin(clients, eq(events.clientId, clients.id))
      .where(
        and(
          eq(events.tenantId, tenantId),
          gte(events.endDate, startDate),
          lte(events.startDate, endDate),
          sql`${events.status} IN ('draft', 'confirmed', 'in_progress')`
        )
      );

    // Group contracts by vehicle
    const contractsByVehicle = new Map<string, PlanningContract[]>();
    for (const row of contractRows) {
      const contract: PlanningContract = {
        id: row.id,
        contractNumber: row.contractNumber,
        clientName: `${row.clientFirstName} ${row.clientLastName}`,
        vehicleId: row.vehicleId,
        vehicleName: "",
        plateNumber: "",
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
        totalAmount: row.totalAmount,
      };

      const list = contractsByVehicle.get(row.vehicleId) ?? [];
      list.push(contract);
      contractsByVehicle.set(row.vehicleId, list);
    }

    // Group maintenance by vehicle
    const maintenanceByVehicle = new Map<string, PlanningMaintenance[]>();
    for (const row of maintenanceRows) {
      const maintenance: PlanningMaintenance = {
        id: row.id,
        type: row.type,
        status: row.status,
        description: row.description,
        startDate: row.startDate,
        endDate: row.endDate,
      };

      const list = maintenanceByVehicle.get(row.vehicleId) ?? [];
      list.push(maintenance);
      maintenanceByVehicle.set(row.vehicleId, list);
    }

    // Group events by vehicle (one event can appear on several vehicle rows)
    const eventsByVehicle = new Map<string, PlanningEvent[]>();
    for (const row of eventRows) {
      const event: PlanningEvent = {
        id: row.id,
        eventNumber: row.eventNumber,
        title: row.title,
        vehicleId: row.vehicleId,
        clientName: `${row.clientFirstName} ${row.clientLastName}`,
        fonctionName: row.fonctionName,
        fonctionColor: row.fonctionColor,
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
      };

      const list = eventsByVehicle.get(row.vehicleId) ?? [];
      list.push(event);
      eventsByVehicle.set(row.vehicleId, list);
    }

    const planningVehicles: PlanningVehicle[] = vehicleRows.map((v) => {
      const vehicleContracts = contractsByVehicle.get(v.id) ?? [];
      const vehicleMaintenance = maintenanceByVehicle.get(v.id) ?? [];
      const dailyRate = v.dailyRateOverride
        ? parseFloat(v.dailyRateOverride)
        : v.categoryDailyRate
          ? parseFloat(v.categoryDailyRate)
          : 0;
      return {
        id: v.id,
        name: `${v.brand} ${v.model}`,
        plateNumber: v.plateNumber,
        status: v.status,
        dailyRate,
        categoryName: v.categoryName,
        contracts: vehicleContracts.map((c) => ({
          ...c,
          vehicleName: `${v.brand} ${v.model}`,
          plateNumber: v.plateNumber,
        })),
        maintenance: vehicleMaintenance,
        events: eventsByVehicle.get(v.id) ?? [],
      };
    });

    return {
      success: true,
      data: {
        vehicles: planningVehicles,
        startDate: startDateStr,
        endDate: endDateStr,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getPlanningData error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement du planning",
    };
  }
}
