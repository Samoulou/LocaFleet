"use server";

import { eq, and, isNull, ne, inArray } from "drizzle-orm";
import { db } from "@/db";
import { vehicles, maintenanceRecords } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import { createMaintenanceSchema } from "@/lib/validations/maintenance";
import { closeMaintenanceSchema } from "@/lib/validations/close-maintenance";
import { createAuditLog } from "@/actions/audit-logs";
import type { ActionResult } from "@/types";

// ============================================================================
// createMaintenanceRecord
// ============================================================================

export async function createMaintenanceRecord(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("vehicles", "create");

    // 1. Validate input
    const parsed = createMaintenanceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const {
      vehicleId,
      type,
      description,
      startDate,
      estimatedCost,
      mechanicName,
      mechanicEmail,
      urgency,
      notes,
    } = parsed.data;

    // 2. Fetch vehicle (tenant-scoped, not soft-deleted)
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

    // 3. Transaction: insert maintenance + update vehicle status + audit log
    let maintenanceId = "";

    await db.transaction(async (tx) => {
      // Insert maintenance record
      const [record] = await tx
        .insert(maintenanceRecords)
        .values({
          tenantId: currentUser.tenantId,
          vehicleId,
          createdByUserId: currentUser.id,
          type,
          description,
          startDate,
          estimatedCost: estimatedCost?.toString(),
          mechanicName: mechanicName ?? null,
          mechanicEmail: mechanicEmail ?? null,
          urgency,
          notes: notes ?? null,
          status: "open",
        })
        .returning({ id: maintenanceRecords.id });

      maintenanceId = record.id;

      // Update vehicle status to "maintenance" if not already
      if (vehicle.status !== "maintenance") {
        await tx
          .update(vehicles)
          .set({
            status: "maintenance",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(vehicles.id, vehicleId),
              eq(vehicles.tenantId, currentUser.tenantId)
            )
          );
      }

      // Audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "maintenance_created",
          entityType: "vehicle",
          entityId: vehicleId,
          changes: {
            maintenanceId,
            type,
            description,
            previousStatus: vehicle.status,
            newStatus: "maintenance",
          },
          metadata: mechanicName ? { mechanicName } : null,
        },
        tx
      );
    });

    return {
      success: true,
      data: { id: maintenanceId },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "createMaintenanceRecord error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la création de la maintenance",
    };
  }
}

// ============================================================================
// closeMaintenanceRecord
// ============================================================================

export async function closeMaintenanceRecord(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("vehicles", "create");

    // 1. Validate input
    const parsed = closeMaintenanceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { maintenanceId, endDate, finalCost, notes } = parsed.data;

    // 2. Transaction: fetch, validate, close record, restore vehicle, audit
    let recordNotFound = false;
    let alreadyCompleted = false;

    await db.transaction(async (tx) => {
      // Fetch maintenance record inside transaction (tenant-scoped)
      const [record] = await tx
        .select({
          id: maintenanceRecords.id,
          vehicleId: maintenanceRecords.vehicleId,
          status: maintenanceRecords.status,
        })
        .from(maintenanceRecords)
        .where(
          and(
            eq(maintenanceRecords.id, maintenanceId),
            eq(maintenanceRecords.tenantId, currentUser.tenantId)
          )
        );

      if (!record) {
        recordNotFound = true;
        return;
      }

      if (record.status === "completed") {
        alreadyCompleted = true;
        return;
      }

      // Update maintenance record to completed
      // Only overwrite notes if the user provided closing notes
      const updateFields: Record<string, unknown> = {
        status: "completed",
        endDate,
        finalCost: finalCost?.toString() ?? null,
        updatedAt: new Date(),
      };
      if (notes !== undefined) {
        updateFields.notes = notes;
      }

      await tx
        .update(maintenanceRecords)
        .set(updateFields)
        .where(
          and(
            eq(maintenanceRecords.id, maintenanceId),
            eq(maintenanceRecords.tenantId, currentUser.tenantId)
          )
        );

      // Check if vehicle has other open/in_progress maintenance records
      const otherOpenRecords = await tx
        .select({ id: maintenanceRecords.id })
        .from(maintenanceRecords)
        .where(
          and(
            eq(maintenanceRecords.vehicleId, record.vehicleId),
            eq(maintenanceRecords.tenantId, currentUser.tenantId),
            inArray(maintenanceRecords.status, ["open", "in_progress"]),
            ne(maintenanceRecords.id, maintenanceId)
          )
        );

      // Set vehicle back to "available" only if no other open records
      // AND vehicle is currently in "maintenance" (single conditional UPDATE)
      if (otherOpenRecords.length === 0) {
        await tx
          .update(vehicles)
          .set({
            status: "available",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(vehicles.id, record.vehicleId),
              eq(vehicles.tenantId, currentUser.tenantId),
              eq(vehicles.status, "maintenance")
            )
          );
      }

      // Audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "maintenance_closed",
          entityType: "vehicle",
          entityId: record.vehicleId,
          changes: {
            maintenanceId,
            endDate,
            finalCost: finalCost ?? null,
            notes: notes ?? null,
          },
        },
        tx
      );
    });

    if (recordNotFound) {
      return {
        success: false,
        error: "Cet enregistrement de maintenance n'existe pas",
      };
    }

    if (alreadyCompleted) {
      return {
        success: false,
        error: "Cette maintenance est déjà clôturée",
      };
    }

    return {
      success: true,
      data: { id: maintenanceId },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "closeMaintenanceRecord error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la clôture de la maintenance",
    };
  }
}
