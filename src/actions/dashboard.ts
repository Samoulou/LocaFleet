"use server";

import { eq, and, gte, lte, lt, sql, count, desc, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  rentalContracts,
  vehicles,
  clients,
  invoices,
  maintenanceRecords,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import type { ActionResult } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type DashboardStats = {
  activeRentals: number;
  returnsDueToday: number;
  overdueReturns: number;
  vehiclesInMaintenance: number;
  availableVehicles: number;
  monthlyRevenue: number;
};

export type ActiveRental = {
  id: string;
  contractNumber: string;
  clientName: string;
  vehicleName: string;
  plateNumber: string;
  startDate: Date;
  endDate: Date;
  totalAmount: string;
};

export type ReturnDue = {
  id: string;
  contractNumber: string;
  clientName: string;
  vehicleName: string;
  plateNumber: string;
  endDate: Date;
  isOverdue: boolean;
  daysOverdue: number;
};

export type MaintenanceAlert = {
  id: string;
  vehicleName: string;
  plateNumber: string;
  type: string;
  status: string;
  urgency: string;
  description: string;
};

// ============================================================================
// getDashboardStats
// ============================================================================

export async function getDashboardStats(): Promise<
  ActionResult<DashboardStats>
> {
  try {
    const currentUser = await requirePermission("contracts", "read");
    const tenantId = currentUser.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Active rentals: approved, pending_cg, active
    const [activeRentalsResult] = await db
      .select({ count: count() })
      .from(rentalContracts)
      .where(
        and(
          eq(rentalContracts.tenantId, tenantId),
          sql`${rentalContracts.status} IN ('approved', 'pending_cg', 'active')`
        )
      );

    // Returns due today: endDate is today
    const [returnsDueTodayResult] = await db
      .select({ count: count() })
      .from(rentalContracts)
      .where(
        and(
          eq(rentalContracts.tenantId, tenantId),
          sql`${rentalContracts.status} IN ('approved', 'pending_cg', 'active')`,
          gte(rentalContracts.endDate, today),
          lt(rentalContracts.endDate, tomorrow)
        )
      );

    // Overdue returns: endDate < today and still active
    const [overdueReturnsResult] = await db
      .select({ count: count() })
      .from(rentalContracts)
      .where(
        and(
          eq(rentalContracts.tenantId, tenantId),
          sql`${rentalContracts.status} IN ('approved', 'pending_cg', 'active')`,
          lt(rentalContracts.endDate, today)
        )
      );

    // Vehicles in maintenance
    const [maintenanceResult] = await db
      .select({ count: count() })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.tenantId, tenantId),
          eq(vehicles.status, "maintenance")
        )
      );

    // Available vehicles
    const [availableResult] = await db
      .select({ count: count() })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.tenantId, tenantId),
          eq(vehicles.status, "available")
        )
      );

    // Monthly revenue: sum of paid invoices this month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [revenueResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.status, "paid"),
          gte(invoices.issuedAt, startOfMonth)
        )
      );

    return {
      success: true,
      data: {
        activeRentals: activeRentalsResult?.count ?? 0,
        returnsDueToday: returnsDueTodayResult?.count ?? 0,
        overdueReturns: overdueReturnsResult?.count ?? 0,
        vehiclesInMaintenance: maintenanceResult?.count ?? 0,
        availableVehicles: availableResult?.count ?? 0,
        monthlyRevenue: Number(revenueResult?.total ?? 0),
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getDashboardStats error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des statistiques",
    };
  }
}

// ============================================================================
// getActiveRentals
// ============================================================================

export async function getActiveRentals(): Promise<
  ActionResult<ActiveRental[]>
> {
  try {
    const currentUser = await requirePermission("contracts", "read");
    const tenantId = currentUser.tenantId;

    const data = await db
      .select({
        id: rentalContracts.id,
        contractNumber: rentalContracts.contractNumber,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        vehicleBrand: vehicles.brand,
        vehicleModel: vehicles.model,
        plateNumber: vehicles.plateNumber,
        startDate: rentalContracts.startDate,
        endDate: rentalContracts.endDate,
        totalAmount: rentalContracts.totalAmount,
      })
      .from(rentalContracts)
      .innerJoin(clients, eq(rentalContracts.clientId, clients.id))
      .innerJoin(vehicles, eq(rentalContracts.vehicleId, vehicles.id))
      .where(
        and(
          eq(rentalContracts.tenantId, tenantId),
          sql`${rentalContracts.status} IN ('approved', 'pending_cg', 'active')`
        )
      )
      .orderBy(desc(rentalContracts.startDate))
      .limit(10);

    return {
      success: true,
      data: data.map((row) => ({
        id: row.id,
        contractNumber: row.contractNumber,
        clientName: `${row.clientFirstName} ${row.clientLastName}`,
        vehicleName: `${row.vehicleBrand} ${row.vehicleModel}`,
        plateNumber: row.plateNumber,
        startDate: row.startDate,
        endDate: row.endDate,
        totalAmount: row.totalAmount,
      })),
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getActiveRentals error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des locations actives",
    };
  }
}

// ============================================================================
// getReturnsDue
// ============================================================================

export async function getReturnsDue(): Promise<ActionResult<ReturnDue[]>> {
  try {
    const currentUser = await requirePermission("contracts", "read");
    const tenantId = currentUser.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await db
      .select({
        id: rentalContracts.id,
        contractNumber: rentalContracts.contractNumber,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        vehicleBrand: vehicles.brand,
        vehicleModel: vehicles.model,
        plateNumber: vehicles.plateNumber,
        endDate: rentalContracts.endDate,
      })
      .from(rentalContracts)
      .innerJoin(clients, eq(rentalContracts.clientId, clients.id))
      .innerJoin(vehicles, eq(rentalContracts.vehicleId, vehicles.id))
      .where(
        and(
          eq(rentalContracts.tenantId, tenantId),
          sql`${rentalContracts.status} IN ('approved', 'pending_cg', 'active')`,
          lte(rentalContracts.endDate, today)
        )
      )
      .orderBy(rentalContracts.endDate)
      .limit(10);

    return {
      success: true,
      data: data.map((row) => {
        const endDate = new Date(row.endDate);
        endDate.setHours(0, 0, 0, 0);
        const diffMs = today.getTime() - endDate.getTime();
        const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        return {
          id: row.id,
          contractNumber: row.contractNumber,
          clientName: `${row.clientFirstName} ${row.clientLastName}`,
          vehicleName: `${row.vehicleBrand} ${row.vehicleModel}`,
          plateNumber: row.plateNumber,
          endDate: row.endDate,
          isOverdue: daysOverdue > 0,
          daysOverdue,
        };
      }),
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getReturnsDue error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des retours",
    };
  }
}

// ============================================================================
// getMaintenanceAlerts
// ============================================================================

export async function getMaintenanceAlerts(): Promise<
  ActionResult<MaintenanceAlert[]>
> {
  try {
    const currentUser = await requirePermission("vehicles", "read");
    const tenantId = currentUser.tenantId;

    const data = await db
      .select({
        id: maintenanceRecords.id,
        vehicleBrand: vehicles.brand,
        vehicleModel: vehicles.model,
        plateNumber: vehicles.plateNumber,
        type: maintenanceRecords.type,
        status: maintenanceRecords.status,
        urgency: maintenanceRecords.urgency,
        description: maintenanceRecords.description,
      })
      .from(maintenanceRecords)
      .innerJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id))
      .where(
        and(
          eq(maintenanceRecords.tenantId, tenantId),
          sql`${maintenanceRecords.status} IN ('open', 'in_progress')`
        )
      )
      .orderBy(
        sql`CASE ${maintenanceRecords.urgency}
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END`,
        maintenanceRecords.createdAt
      )
      .limit(10);

    return {
      success: true,
      data: data.map((row) => ({
        id: row.id,
        vehicleName: `${row.vehicleBrand} ${row.vehicleModel}`,
        plateNumber: row.plateNumber,
        type: row.type,
        status: row.status,
        urgency: row.urgency ?? "medium",
        description: row.description,
      })),
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getMaintenanceAlerts error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors du chargement des alertes de maintenance",
    };
  }
}
