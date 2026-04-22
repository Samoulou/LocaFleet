"use server";

import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  rentalContracts,
  vehicles,
  clients,
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

export type PlanningVehicle = {
  id: string;
  name: string;
  plateNumber: string;
  status: string;
  contracts: PlanningContract[];
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
      })
      .from(vehicles)
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

    const planningVehicles: PlanningVehicle[] = vehicleRows.map((v) => {
      const vehicleContracts = contractsByVehicle.get(v.id) ?? [];
      return {
        id: v.id,
        name: `${v.brand} ${v.model}`,
        plateNumber: v.plateNumber,
        status: v.status,
        contracts: vehicleContracts.map((c) => ({
          ...c,
          vehicleName: `${v.brand} ${v.model}`,
          plateNumber: v.plateNumber,
        })),
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
