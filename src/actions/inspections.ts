"use server";

import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  inspections,
  inspectionPhotos,
  inspectionDamages,
  rentalContracts,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  createDraftInspectionSchema,
  submitDepartureInspectionSchema,
  updateDepartureInspectionSchema,
  saveInspectionPhotoSchema,
  deleteInspectionPhotoSchema,
} from "@/lib/validations/inspection";
import { createAuditLog } from "@/actions/audit-logs";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ActionResult } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type DepartureInspectionDetail = {
  id: string;
  contractId: string;
  vehicleId: string;
  type: string;
  isDraft: boolean;
  mileage: number;
  fuelLevel: string;
  exteriorCleanliness: string | null;
  interiorCleanliness: string | null;
  clientSignatureUrl: string | null;
  agentNotes: string | null;
  conductedAt: Date;
  photos: {
    id: string;
    url: string;
    fileName: string | null;
    position: string | null;
    caption: string | null;
    sortOrder: number | null;
  }[];
  damages: {
    id: string;
    zone: string;
    type: string;
    severity: string;
    description: string | null;
    photoUrl: string | null;
    isPreExisting: boolean;
  }[];
};

class InspectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InspectionError";
  }
}

const STORAGE_BUCKET = "inspection-photos";

// ============================================================================
// createDraftInspection
// ============================================================================

export async function createDraftInspection(
  input: unknown
): Promise<ActionResult<{ inspectionId: string }>> {
  try {
    const currentUser = await requirePermission("inspections", "create");

    const parsed = createDraftInspectionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { contractId } = parsed.data;
    let inspectionId = "";

    await db.transaction(async (tx) => {
      // Fetch contract (tenant-scoped, must be approved or pending_cg)
      const [contract] = await tx
        .select({
          id: rentalContracts.id,
          tenantId: rentalContracts.tenantId,
          vehicleId: rentalContracts.vehicleId,
          status: rentalContracts.status,
        })
        .from(rentalContracts)
        .where(
          and(
            eq(rentalContracts.id, contractId),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        );

      if (!contract) {
        throw new InspectionError("Ce contrat n'existe pas");
      }

      if (contract.status !== "approved" && contract.status !== "pending_cg") {
        throw new InspectionError(
          "Le contrat doit être approuvé pour créer un constat de départ"
        );
      }

      // Check no existing departure inspection
      const [existing] = await tx
        .select({ id: inspections.id })
        .from(inspections)
        .where(
          and(
            eq(inspections.contractId, contractId),
            eq(inspections.type, "departure"),
            eq(inspections.tenantId, currentUser.tenantId)
          )
        );

      if (existing) {
        throw new InspectionError(
          "Un constat de départ existe déjà pour ce contrat"
        );
      }

      // Insert draft inspection
      const [newInspection] = await tx
        .insert(inspections)
        .values({
          tenantId: currentUser.tenantId,
          contractId,
          vehicleId: contract.vehicleId,
          conductedByUserId: currentUser.id,
          type: "departure",
          isDraft: true,
          mileage: 0,
          fuelLevel: "empty",
        })
        .returning({ id: inspections.id });

      inspectionId = newInspection.id;
    });

    return { success: true, data: { inspectionId } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    if (err instanceof InspectionError) {
      return { success: false, error: err.message };
    }
    console.error(
      "createDraftInspection error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la création du brouillon",
    };
  }
}

// ============================================================================
// submitDepartureInspection
// ============================================================================

export async function submitDepartureInspection(
  input: unknown
): Promise<ActionResult<{ inspectionId: string }>> {
  try {
    const currentUser = await requirePermission("inspections", "create");

    const parsed = submitDepartureInspectionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const {
      inspectionId,
      contractId,
      mileage,
      fuelLevel,
      exteriorCleanliness,
      interiorCleanliness,
      agentNotes,
      clientSignatureUrl,
      damages,
    } = parsed.data;

    await db.transaction(async (tx) => {
      // Fetch inspection (must be draft, type departure)
      const [inspection] = await tx
        .select({
          id: inspections.id,
          tenantId: inspections.tenantId,
          isDraft: inspections.isDraft,
          type: inspections.type,
        })
        .from(inspections)
        .where(
          and(
            eq(inspections.id, inspectionId),
            eq(inspections.tenantId, currentUser.tenantId)
          )
        );

      if (!inspection) {
        throw new InspectionError("Ce constat n'existe pas");
      }

      if (!inspection.isDraft) {
        throw new InspectionError("Ce constat a déjà été soumis");
      }

      if (inspection.type !== "departure") {
        throw new InspectionError("Ce constat n'est pas un constat de départ");
      }

      // Fetch contract (must be approved or pending_cg)
      const [contract] = await tx
        .select({
          id: rentalContracts.id,
          status: rentalContracts.status,
          vehicleId: rentalContracts.vehicleId,
        })
        .from(rentalContracts)
        .where(
          and(
            eq(rentalContracts.id, contractId),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        );

      if (!contract) {
        throw new InspectionError("Ce contrat n'existe pas");
      }

      if (contract.status !== "approved" && contract.status !== "pending_cg") {
        throw new InspectionError(
          "Le contrat doit être approuvé pour soumettre le constat"
        );
      }

      // Update inspection
      await tx
        .update(inspections)
        .set({
          mileage,
          fuelLevel,
          exteriorCleanliness,
          interiorCleanliness,
          agentNotes: agentNotes ?? null,
          clientSignatureUrl: clientSignatureUrl ?? null,
          isDraft: false,
          conductedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inspections.id, inspectionId));

      // Replace damages: delete old, insert new
      await tx
        .delete(inspectionDamages)
        .where(eq(inspectionDamages.inspectionId, inspectionId));

      if (damages.length > 0) {
        await tx.insert(inspectionDamages).values(
          damages.map((d) => ({
            inspectionId,
            zone: d.zone,
            type: d.type,
            severity: d.severity,
            description: d.description ?? null,
            photoUrl: d.photoUrl === "" ? null : (d.photoUrl ?? null),
            isPreExisting: d.isPreExisting,
          }))
        );
      }

      // Update contract: departureMileage + status -> active
      await tx
        .update(rentalContracts)
        .set({
          departureMileage: mileage,
          status: "active",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(rentalContracts.id, contractId),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        );

      // Audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "departure_inspection_submitted",
          entityType: "inspection",
          entityId: inspectionId,
          changes: {
            contractId,
            mileage,
            fuelLevel,
            damageCount: damages.length,
          },
        },
        tx
      );
    });

    return { success: true, data: { inspectionId } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    if (err instanceof InspectionError) {
      return { success: false, error: err.message };
    }
    console.error(
      "submitDepartureInspection error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la soumission du constat",
    };
  }
}

// ============================================================================
// updateDepartureInspection
// ============================================================================

export async function updateDepartureInspection(
  input: unknown
): Promise<ActionResult<{ inspectionId: string }>> {
  try {
    const currentUser = await requirePermission("inspections", "update");

    const parsed = updateDepartureInspectionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const {
      inspectionId,
      contractId,
      mileage,
      fuelLevel,
      exteriorCleanliness,
      interiorCleanliness,
      agentNotes,
      clientSignatureUrl,
      damages,
    } = parsed.data;

    await db.transaction(async (tx) => {
      // Fetch inspection (must not be draft)
      const [inspection] = await tx
        .select({
          id: inspections.id,
          tenantId: inspections.tenantId,
          isDraft: inspections.isDraft,
          type: inspections.type,
        })
        .from(inspections)
        .where(
          and(
            eq(inspections.id, inspectionId),
            eq(inspections.tenantId, currentUser.tenantId)
          )
        );

      if (!inspection) {
        throw new InspectionError("Ce constat n'existe pas");
      }

      if (inspection.isDraft) {
        throw new InspectionError(
          "Ce constat est encore un brouillon, utilisez la soumission"
        );
      }

      // Fetch contract (must be active)
      const [contract] = await tx
        .select({
          id: rentalContracts.id,
          status: rentalContracts.status,
        })
        .from(rentalContracts)
        .where(
          and(
            eq(rentalContracts.id, contractId),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        );

      if (!contract) {
        throw new InspectionError("Ce contrat n'existe pas");
      }

      if (contract.status !== "active") {
        throw new InspectionError(
          "Le contrat doit être actif pour modifier le constat"
        );
      }

      // Update inspection
      await tx
        .update(inspections)
        .set({
          mileage,
          fuelLevel,
          exteriorCleanliness,
          interiorCleanliness,
          agentNotes: agentNotes ?? null,
          clientSignatureUrl: clientSignatureUrl ?? null,
          updatedAt: new Date(),
        })
        .where(eq(inspections.id, inspectionId));

      // Replace damages
      await tx
        .delete(inspectionDamages)
        .where(eq(inspectionDamages.inspectionId, inspectionId));

      if (damages.length > 0) {
        await tx.insert(inspectionDamages).values(
          damages.map((d) => ({
            inspectionId,
            zone: d.zone,
            type: d.type,
            severity: d.severity,
            description: d.description ?? null,
            photoUrl: d.photoUrl === "" ? null : (d.photoUrl ?? null),
            isPreExisting: d.isPreExisting,
          }))
        );
      }

      // Update contract departureMileage
      await tx
        .update(rentalContracts)
        .set({
          departureMileage: mileage,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(rentalContracts.id, contractId),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        );

      // Audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "departure_inspection_updated",
          entityType: "inspection",
          entityId: inspectionId,
          changes: {
            contractId,
            mileage,
            fuelLevel,
            damageCount: damages.length,
          },
        },
        tx
      );
    });

    return { success: true, data: { inspectionId } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    if (err instanceof InspectionError) {
      return { success: false, error: err.message };
    }
    console.error(
      "updateDepartureInspection error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la modification du constat",
    };
  }
}

// ============================================================================
// getDepartureInspection
// ============================================================================

export async function getDepartureInspection(
  contractId: string
): Promise<ActionResult<DepartureInspectionDetail | null>> {
  try {
    const currentUser = await requirePermission("inspections", "read");

    // Fetch departure inspection for this contract
    const [inspection] = await db
      .select({
        id: inspections.id,
        contractId: inspections.contractId,
        vehicleId: inspections.vehicleId,
        type: inspections.type,
        isDraft: inspections.isDraft,
        mileage: inspections.mileage,
        fuelLevel: inspections.fuelLevel,
        exteriorCleanliness: inspections.exteriorCleanliness,
        interiorCleanliness: inspections.interiorCleanliness,
        clientSignatureUrl: inspections.clientSignatureUrl,
        agentNotes: inspections.agentNotes,
        conductedAt: inspections.conductedAt,
      })
      .from(inspections)
      .where(
        and(
          eq(inspections.contractId, contractId),
          eq(inspections.type, "departure"),
          eq(inspections.tenantId, currentUser.tenantId)
        )
      );

    if (!inspection) {
      return { success: true, data: null };
    }

    // Fetch photos
    const photos = await db
      .select({
        id: inspectionPhotos.id,
        url: inspectionPhotos.url,
        fileName: inspectionPhotos.fileName,
        position: inspectionPhotos.position,
        caption: inspectionPhotos.caption,
        sortOrder: inspectionPhotos.sortOrder,
      })
      .from(inspectionPhotos)
      .where(eq(inspectionPhotos.inspectionId, inspection.id));

    // Fetch damages
    const damages = await db
      .select({
        id: inspectionDamages.id,
        zone: inspectionDamages.zone,
        type: inspectionDamages.type,
        severity: inspectionDamages.severity,
        description: inspectionDamages.description,
        photoUrl: inspectionDamages.photoUrl,
        isPreExisting: inspectionDamages.isPreExisting,
      })
      .from(inspectionDamages)
      .where(eq(inspectionDamages.inspectionId, inspection.id));

    return {
      success: true,
      data: {
        ...inspection,
        photos,
        damages,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getDepartureInspection error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement du constat",
    };
  }
}

// ============================================================================
// saveInspectionPhoto
// ============================================================================

export async function saveInspectionPhoto(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("inspections", "update");

    const parsed = saveInspectionPhotoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { inspectionId, url, fileName, position, caption } = parsed.data;

    // Verify inspection belongs to tenant
    const [inspection] = await db
      .select({ id: inspections.id })
      .from(inspections)
      .where(
        and(
          eq(inspections.id, inspectionId),
          eq(inspections.tenantId, currentUser.tenantId)
        )
      );

    if (!inspection) {
      return { success: false, error: "Ce constat n'existe pas" };
    }

    // Count existing photos (max 10)
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inspectionPhotos)
      .where(eq(inspectionPhotos.inspectionId, inspectionId));

    if (countResult && countResult.count >= 10) {
      return {
        success: false,
        error: "Le nombre maximum de photos (10) est atteint",
      };
    }

    // Insert photo
    const [newPhoto] = await db
      .insert(inspectionPhotos)
      .values({
        inspectionId,
        url,
        fileName: fileName ?? null,
        position: position ?? null,
        caption: caption ?? null,
        sortOrder: countResult?.count ?? 0,
      })
      .returning({ id: inspectionPhotos.id });

    return { success: true, data: { id: newPhoto.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "saveInspectionPhoto error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de l'enregistrement de la photo",
    };
  }
}

// ============================================================================
// deleteInspectionPhoto
// ============================================================================

export async function deleteInspectionPhoto(
  input: unknown
): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("inspections", "update");

    const parsed = deleteInspectionPhotoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { photoId, inspectionId } = parsed.data;

    // Verify inspection belongs to tenant
    const [inspection] = await db
      .select({ id: inspections.id })
      .from(inspections)
      .where(
        and(
          eq(inspections.id, inspectionId),
          eq(inspections.tenantId, currentUser.tenantId)
        )
      );

    if (!inspection) {
      return { success: false, error: "Ce constat n'existe pas" };
    }

    // Fetch photo for URL
    const [photo] = await db
      .select({ id: inspectionPhotos.id, url: inspectionPhotos.url })
      .from(inspectionPhotos)
      .where(
        and(
          eq(inspectionPhotos.id, photoId),
          eq(inspectionPhotos.inspectionId, inspectionId)
        )
      );

    if (!photo) {
      return { success: false, error: "Cette photo n'existe pas" };
    }

    // Delete from Supabase Storage
    try {
      const supabase = getSupabaseServerClient();
      const urlObj = new URL(photo.url);
      const pathMatch = urlObj.pathname.match(
        /\/storage\/v1\/object\/public\/([^/]+)\/(.+)/
      );
      if (pathMatch) {
        const bucket = pathMatch[1];
        const filePath = pathMatch[2];
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

    // Delete from DB
    await db.delete(inspectionPhotos).where(eq(inspectionPhotos.id, photoId));

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "deleteInspectionPhoto error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la suppression de la photo",
    };
  }
}
