"use server";

import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@/db";
import { vehicles, vehiclePhotos } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  saveVehiclePhotoSchema,
  deleteVehiclePhotoSchema,
  setCoverPhotoSchema,
} from "@/lib/validations/vehicle-photos";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ActionResult } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type VehiclePhoto = {
  id: string;
  url: string;
  fileName: string | null;
  isCover: boolean | null;
  sortOrder: number | null;
  createdAt: Date;
};

// Expected Supabase Storage bucket name for vehicle photos
const STORAGE_BUCKET = "vehicle-photos";

// ============================================================================
// listVehiclePhotos
// ============================================================================

export async function listVehiclePhotos(
  vehicleId: string
): Promise<ActionResult<VehiclePhoto[]>> {
  try {
    const currentUser = await requirePermission("vehicles", "read");

    // Verify vehicle belongs to tenant
    const [vehicle] = await db
      .select({ id: vehicles.id })
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

    const photos = await db
      .select({
        id: vehiclePhotos.id,
        url: vehiclePhotos.url,
        fileName: vehiclePhotos.fileName,
        isCover: vehiclePhotos.isCover,
        sortOrder: vehiclePhotos.sortOrder,
        createdAt: vehiclePhotos.createdAt,
      })
      .from(vehiclePhotos)
      .where(eq(vehiclePhotos.vehicleId, vehicleId))
      .orderBy(asc(vehiclePhotos.sortOrder), asc(vehiclePhotos.createdAt));

    return { success: true, data: photos };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "listVehiclePhotos error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des photos",
    };
  }
}

// ============================================================================
// saveVehiclePhoto
// ============================================================================

export async function saveVehiclePhoto(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("vehicles", "update");

    const parsed = saveVehiclePhotoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { vehicleId, url, fileName } = parsed.data;

    // Verify vehicle belongs to tenant
    const [vehicle] = await db
      .select({ id: vehicles.id })
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

    // Insert photo + conditional cover update in a transaction
    const created = await db.transaction(async (tx) => {
      // Check if this is the first photo (auto-cover) — limit(1) optimization
      const [existingPhoto] = await tx
        .select({ id: vehiclePhotos.id })
        .from(vehiclePhotos)
        .where(eq(vehiclePhotos.vehicleId, vehicleId))
        .limit(1);

      const isFirstPhoto = !existingPhoto;

      // Insert photo record
      const [newPhoto] = await tx
        .insert(vehiclePhotos)
        .values({
          vehicleId,
          url,
          fileName: fileName ?? null,
          isCover: isFirstPhoto,
          sortOrder: 0,
        })
        .returning({ id: vehiclePhotos.id });

      // If first photo, set as cover on the vehicle
      if (isFirstPhoto) {
        await tx
          .update(vehicles)
          .set({ coverPhotoUrl: url, updatedAt: new Date() })
          .where(
            and(
              eq(vehicles.id, vehicleId),
              eq(vehicles.tenantId, currentUser.tenantId),
              isNull(vehicles.deletedAt)
            )
          );
      }

      return newPhoto;
    });

    return { success: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "saveVehiclePhoto error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de l'enregistrement de la photo",
    };
  }
}

// ============================================================================
// deleteVehiclePhoto
// ============================================================================

export async function deleteVehiclePhoto(
  input: unknown
): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("vehicles", "update");

    const parsed = deleteVehiclePhotoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { photoId, vehicleId } = parsed.data;

    // Verify vehicle belongs to tenant
    const [vehicle] = await db
      .select({ id: vehicles.id })
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

    // Get photo details before deletion
    const [photo] = await db
      .select({
        id: vehiclePhotos.id,
        url: vehiclePhotos.url,
        isCover: vehiclePhotos.isCover,
      })
      .from(vehiclePhotos)
      .where(
        and(
          eq(vehiclePhotos.id, photoId),
          eq(vehiclePhotos.vehicleId, vehicleId)
        )
      );

    if (!photo) {
      return { success: false, error: "Cette photo n'existe pas" };
    }

    // Delete from Supabase Storage (outside transaction — external service)
    try {
      const supabase = getSupabaseServerClient();
      const urlObj = new URL(photo.url);
      const pathMatch = urlObj.pathname.match(
        /\/storage\/v1\/object\/public\/([^/]+)\/(.+)/
      );
      if (pathMatch) {
        const bucket = pathMatch[1];
        const filePath = pathMatch[2];
        // Only delete from the expected bucket
        if (bucket === STORAGE_BUCKET) {
          await supabase.storage.from(bucket).remove([filePath]);
        }
      }
    } catch (storageErr) {
      console.error(
        "Storage deletion error (continuing with DB deletion):",
        storageErr instanceof Error ? storageErr.message : "Unknown error"
      );
    }

    // Delete from DB + cover promotion in a transaction
    await db.transaction(async (tx) => {
      await tx.delete(vehiclePhotos).where(eq(vehiclePhotos.id, photoId));

      // If deleted photo was cover, promote next photo or clear cover
      if (photo.isCover) {
        const [nextPhoto] = await tx
          .select({ id: vehiclePhotos.id, url: vehiclePhotos.url })
          .from(vehiclePhotos)
          .where(eq(vehiclePhotos.vehicleId, vehicleId))
          .orderBy(asc(vehiclePhotos.sortOrder), asc(vehiclePhotos.createdAt))
          .limit(1);

        if (nextPhoto) {
          await tx
            .update(vehiclePhotos)
            .set({ isCover: true })
            .where(eq(vehiclePhotos.id, nextPhoto.id));

          await tx
            .update(vehicles)
            .set({ coverPhotoUrl: nextPhoto.url, updatedAt: new Date() })
            .where(
              and(
                eq(vehicles.id, vehicleId),
                eq(vehicles.tenantId, currentUser.tenantId),
                isNull(vehicles.deletedAt)
              )
            );
        } else {
          // No photos remain, clear cover
          await tx
            .update(vehicles)
            .set({ coverPhotoUrl: null, updatedAt: new Date() })
            .where(
              and(
                eq(vehicles.id, vehicleId),
                eq(vehicles.tenantId, currentUser.tenantId),
                isNull(vehicles.deletedAt)
              )
            );
        }
      }
    });

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "deleteVehiclePhoto error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la suppression de la photo",
    };
  }
}

// ============================================================================
// setCoverPhoto
// ============================================================================

export async function setCoverPhoto(
  input: unknown
): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("vehicles", "update");

    const parsed = setCoverPhotoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { photoId, vehicleId } = parsed.data;

    // Verify vehicle belongs to tenant
    const [vehicle] = await db
      .select({ id: vehicles.id })
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

    // Get selected photo
    const [photo] = await db
      .select({ id: vehiclePhotos.id, url: vehiclePhotos.url })
      .from(vehiclePhotos)
      .where(
        and(
          eq(vehiclePhotos.id, photoId),
          eq(vehiclePhotos.vehicleId, vehicleId)
        )
      );

    if (!photo) {
      return { success: false, error: "Cette photo n'existe pas" };
    }

    // All 3 updates in a transaction
    await db.transaction(async (tx) => {
      // Clear all isCover flags for this vehicle
      await tx
        .update(vehiclePhotos)
        .set({ isCover: false })
        .where(eq(vehiclePhotos.vehicleId, vehicleId));

      // Set selected photo as cover
      await tx
        .update(vehiclePhotos)
        .set({ isCover: true })
        .where(eq(vehiclePhotos.id, photoId));

      // Update vehicle cover URL
      await tx
        .update(vehicles)
        .set({ coverPhotoUrl: photo.url, updatedAt: new Date() })
        .where(
          and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.tenantId, currentUser.tenantId),
            isNull(vehicles.deletedAt)
          )
        );
    });

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "setCoverPhoto error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la définition de la photo de couverture",
    };
  }
}
