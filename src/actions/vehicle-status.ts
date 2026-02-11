"use server";

import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { vehicles, rentalContracts, maintenanceRecords } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  changeVehicleStatusSchema,
  ALLOWED_TRANSITIONS,
} from "@/lib/validations/vehicle-status";
import { createAuditLog } from "@/actions/audit-logs";
import type { ActionResult, VehicleStatus } from "@/types";

// ============================================================================
// changeVehicleStatus
// ============================================================================

export async function changeVehicleStatus(
  input: unknown
): Promise<ActionResult<{ id: string; newStatus: VehicleStatus }>> {
  try {
    const currentUser = await requirePermission("vehicles", "update");

    // 1. Validate input
    const parsed = changeVehicleStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const {
      vehicleId,
      newStatus,
      reason,
      createMaintenanceRecord: shouldCreateMaintenance,
      maintenanceDescription,
      maintenanceType,
    } = parsed.data;

    // 2. Prevent manual set to "rented" (defensive)
    if (newStatus === "rented") {
      return {
        success: false,
        error:
          "Le statut 'loué' ne peut être défini que via un contrat de location",
      };
    }

    // 3. Fetch vehicle (tenant-scoped, not soft-deleted)
    const [vehicle] = await db
      .select({
        id: vehicles.id,
        status: vehicles.status,
      })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.tenantId, currentUser.tenantId),
          isNull(vehicles.deletedAt)
        )
      );

    if (!vehicle) {
      return { success: false, error: "Ce véhicule n'existe pas" };
    }

    // 4. Same-status no-op check
    if (vehicle.status === newStatus) {
      return {
        success: false,
        error: "Le véhicule est déjà dans ce statut",
      };
    }

    // 5. If current status is "rented", check for active contract
    if (vehicle.status === "rented") {
      const activeContracts = await db
        .select({ id: rentalContracts.id })
        .from(rentalContracts)
        .where(
          and(
            eq(rentalContracts.vehicleId, vehicleId),
            eq(rentalContracts.tenantId, currentUser.tenantId),
            inArray(rentalContracts.status, ["active", "draft"])
          )
        )
        .limit(1);

      if (activeContracts.length > 0) {
        return {
          success: false,
          error: "Ce véhicule a un contrat actif. Terminez le contrat d'abord.",
        };
      }
    }

    // 6. Validate transition via ALLOWED_TRANSITIONS map
    const allowed = ALLOWED_TRANSITIONS[vehicle.status];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Transition de "${vehicle.status}" vers "${newStatus}" non autorisée`,
      };
    }

    // 7. Transaction: update status + audit log + optional maintenance record
    await db.transaction(async (tx) => {
      // Update vehicle status
      await tx
        .update(vehicles)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.tenantId, currentUser.tenantId)
          )
        );

      // Insert audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "status_change",
          entityType: "vehicle",
          entityId: vehicleId,
          changes: { from: vehicle.status, to: newStatus },
          metadata: reason ? { reason } : null,
        },
        tx
      );

      // Optionally create maintenance record
      if (
        shouldCreateMaintenance &&
        newStatus === "maintenance" &&
        maintenanceDescription &&
        maintenanceType
      ) {
        await tx.insert(maintenanceRecords).values({
          tenantId: currentUser.tenantId,
          vehicleId,
          createdByUserId: currentUser.id,
          type: maintenanceType,
          description: maintenanceDescription,
          status: "open",
        });
      }
    });

    return {
      success: true,
      data: { id: vehicleId, newStatus },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "changeVehicleStatus error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du changement de statut",
    };
  }
}
