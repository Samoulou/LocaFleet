"use server";

import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { Resend } from "resend";
import { db } from "@/db";
import {
  inspections,
  inspectionPhotos,
  inspectionDamages,
  rentalContracts,
  vehicles,
  tenants,
  emailLogs,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  createDraftInspectionSchema,
  submitDepartureInspectionSchema,
  updateDepartureInspectionSchema,
  submitReturnInspectionSchema,
  updateReturnInspectionSchema,
  saveInspectionPhotoSchema,
  deleteInspectionPhotoSchema,
} from "@/lib/validations/inspection";
import { createAuditLog } from "@/actions/audit-logs";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ActionResult } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type InspectionDamageDetail = {
  id: string;
  zone: string;
  type: string;
  severity: string;
  description: string | null;
  photoUrl: string | null;
  isPreExisting: boolean;
};

export type InspectionPhotoDetail = {
  id: string;
  url: string;
  fileName: string | null;
  position: string | null;
  caption: string | null;
  sortOrder: number | null;
};

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
  photos: InspectionPhotoDetail[];
  damages: InspectionDamageDetail[];
};

export type ReturnInspectionDetail = {
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
  mechanicRemarks: string | null;
  conductedAt: Date;
  photos: InspectionPhotoDetail[];
  damages: InspectionDamageDetail[];
  departureDamages: InspectionDamageDetail[];
};

export type ReturnInspectionActionResult = ActionResult<{
  inspectionId: string;
  warning?: string;
}>;

// ============================================================================
// Module-level singleton + helpers
// ============================================================================

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
// createReturnDraftInspection
// ============================================================================

export async function createReturnDraftInspection(
  contractId: string
): Promise<ActionResult<{ inspectionId: string }>> {
  try {
    const currentUser = await requirePermission("inspections", "create");

    const parsedContractId = createDraftInspectionSchema.safeParse({
      contractId,
    });
    if (!parsedContractId.success) {
      return {
        success: false,
        error: parsedContractId.error.issues[0]?.message ?? "Données invalides",
      };
    }

    let inspectionId = "";

    await db.transaction(async (tx) => {
      // Fetch contract (tenant-scoped, must be active)
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

      if (contract.status !== "active") {
        throw new InspectionError(
          "Le contrat doit être actif pour créer un constat de retour"
        );
      }

      // Defense in depth: verify departure inspection exists and is submitted
      const [departureInspection] = await tx
        .select({ id: inspections.id, isDraft: inspections.isDraft })
        .from(inspections)
        .where(
          and(
            eq(inspections.contractId, contractId),
            eq(inspections.type, "departure"),
            eq(inspections.tenantId, currentUser.tenantId)
          )
        );

      if (!departureInspection || departureInspection.isDraft) {
        throw new InspectionError(
          "Un constat de départ validé est requis avant de créer le constat de retour"
        );
      }

      // Check no existing return inspection
      const [existingReturn] = await tx
        .select({ id: inspections.id })
        .from(inspections)
        .where(
          and(
            eq(inspections.contractId, contractId),
            eq(inspections.type, "return"),
            eq(inspections.tenantId, currentUser.tenantId)
          )
        );

      if (existingReturn) {
        throw new InspectionError(
          "Un constat de retour existe déjà pour ce contrat"
        );
      }

      // Insert draft return inspection
      const [newInspection] = await tx
        .insert(inspections)
        .values({
          tenantId: currentUser.tenantId,
          contractId,
          vehicleId: contract.vehicleId,
          conductedByUserId: currentUser.id,
          type: "return",
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
      "createReturnDraftInspection error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la création du brouillon de retour",
    };
  }
}

// ============================================================================
// sendMechanicEmail — internal helper
// ============================================================================

async function sendMechanicEmail(params: {
  tenantId: string;
  contractId: string;
  vehicleId: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  returnMileage: number;
  mechanicRemarks: string;
  mechanicEmail: string;
}): Promise<void> {
  // Validate email format before sending (CRITICAL: tenant settings is JSONB)
  const emailValidation = z.string().email().safeParse(params.mechanicEmail);
  if (!emailValidation.success) {
    console.error("Invalid mechanic email format:", params.mechanicEmail);
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const contractUrl = `${appUrl}/contracts/${encodeURIComponent(params.contractId)}`;
  const safeBrand = escapeHtml(params.vehicleBrand);
  const safeModel = escapeHtml(params.vehicleModel);
  const safePlate = escapeHtml(params.vehiclePlate);
  const safeRemarks = escapeHtml(params.mechanicRemarks).replace(
    /\n/g,
    "<br />"
  );
  const subject = `Remarques mécanicien - ${params.vehicleBrand} ${params.vehicleModel} ${params.vehiclePlate}`;
  const htmlBody = `
    <h2>Remarques mécanicien</h2>
    <p><strong>Véhicule :</strong> ${safeBrand} ${safeModel} (${safePlate})</p>
    <p><strong>Km retour :</strong> ${params.returnMileage.toLocaleString("fr-CH")} km</p>
    <hr />
    <p><strong>Remarques :</strong></p>
    <p>${safeRemarks}</p>
    <hr />
    <p><a href="${contractUrl}">Voir le contrat</a></p>
  `;

  // Send via Resend (lazy singleton)
  const { data, error } = await getResend().emails.send({
    from: "LocaFleet <noreply@locafleet.ch>",
    to: [emailValidation.data],
    subject,
    html: htmlBody,
  });

  // Log in emailLogs
  await db.insert(emailLogs).values({
    tenantId: params.tenantId,
    type: "maintenance_request",
    status: error ? "failed" : "sent",
    recipientEmail: emailValidation.data,
    subject,
    body: htmlBody,
    vehicleId: params.vehicleId,
    contractId: params.contractId,
    resendId: data?.id ?? null,
    errorMessage: error
      ? JSON.stringify(error instanceof Error ? error.message : error)
      : null,
    sentAt: error ? null : new Date(),
  });

  if (error) {
    console.error(
      "Resend mechanic email failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// ============================================================================
// resolveMechanicEmail — shared helper for submit/update return inspection
// Combines vehicle + tenant queries into a single JOIN (avoids N+1)
// ============================================================================

async function resolveMechanicEmail(params: {
  tenantId: string;
  contractId: string;
  mechanicRemarks: string;
  returnMileage: number;
}): Promise<string | undefined> {
  // Single combined query: contract + vehicle + tenant settings
  const [result] = await db
    .select({
      vehicleId: rentalContracts.vehicleId,
      vehicleBrand: vehicles.brand,
      vehicleModel: vehicles.model,
      vehiclePlate: vehicles.plateNumber,
      tenantSettings: tenants.settings,
    })
    .from(rentalContracts)
    .innerJoin(vehicles, eq(rentalContracts.vehicleId, vehicles.id))
    .innerJoin(tenants, eq(rentalContracts.tenantId, tenants.id))
    .where(
      and(
        eq(rentalContracts.id, params.contractId),
        eq(rentalContracts.tenantId, params.tenantId)
      )
    );

  if (!result) return undefined;

  const tenantSettings = result.tenantSettings as Record<
    string,
    unknown
  > | null;
  const mechanicEmail =
    typeof tenantSettings?.mechanicEmail === "string"
      ? tenantSettings.mechanicEmail
      : null;

  if (mechanicEmail) {
    try {
      await sendMechanicEmail({
        tenantId: params.tenantId,
        contractId: params.contractId,
        vehicleId: result.vehicleId,
        vehicleBrand: result.vehicleBrand,
        vehicleModel: result.vehicleModel,
        vehiclePlate: result.vehiclePlate,
        returnMileage: params.returnMileage,
        mechanicRemarks: params.mechanicRemarks,
        mechanicEmail,
      });
    } catch (emailErr) {
      console.error(
        "Mechanic email send error:",
        emailErr instanceof Error ? emailErr.message : "Unknown error"
      );
      return "Le constat a été enregistré mais l'email au mécanicien a échoué";
    }
  } else {
    return "Remarques mécanicien enregistrées, mais aucun email mécanicien n'est configuré dans les paramètres du tenant";
  }

  return undefined;
}

// ============================================================================
// submitReturnInspection
// ============================================================================

export async function submitReturnInspection(
  input: unknown
): Promise<ReturnInspectionActionResult> {
  try {
    const currentUser = await requirePermission("inspections", "create");

    const parsed = submitReturnInspectionSchema.safeParse(input);
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
      mechanicRemarks,
      clientSignatureUrl,
      damages,
    } = parsed.data;

    let warning: string | undefined;

    await db.transaction(async (tx) => {
      // Fetch inspection (must be draft, type return)
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

      if (inspection.type !== "return") {
        throw new InspectionError("Ce constat n'est pas un constat de retour");
      }

      // Fetch contract (must be active)
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

      if (contract.status !== "active") {
        throw new InspectionError(
          "Le contrat doit être actif pour soumettre le constat de retour"
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
          mechanicRemarks: mechanicRemarks ?? null,
          clientSignatureUrl,
          isDraft: false,
          conductedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inspections.id, inspectionId));

      // Replace damages: delete old, insert new (all marked isPreExisting=false)
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
            isPreExisting: false,
          }))
        );
      }

      // Update contract: returnMileage (status stays active — MVP-8 handles completion)
      await tx
        .update(rentalContracts)
        .set({
          returnMileage: mileage,
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
          action: "return_inspection_submitted",
          entityType: "inspection",
          entityId: inspectionId,
          changes: {
            contractId,
            mileage,
            fuelLevel,
            damageCount: damages.length,
            hasMechanicRemarks: !!mechanicRemarks,
          },
        },
        tx
      );
    });

    // Send mechanic email OUTSIDE transaction (non-blocking for DB)
    if (mechanicRemarks) {
      warning = await resolveMechanicEmail({
        tenantId: currentUser.tenantId,
        contractId,
        mechanicRemarks,
        returnMileage: mileage,
      });
    }

    return { success: true, data: { inspectionId, warning } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    if (err instanceof InspectionError) {
      return { success: false, error: err.message };
    }
    console.error(
      "submitReturnInspection error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la soumission du constat de retour",
    };
  }
}

// ============================================================================
// updateReturnInspection
// ============================================================================

export async function updateReturnInspection(
  input: unknown
): Promise<ReturnInspectionActionResult> {
  try {
    const currentUser = await requirePermission("inspections", "update");

    const parsed = updateReturnInspectionSchema.safeParse(input);
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
      mechanicRemarks,
      clientSignatureUrl,
      damages,
    } = parsed.data;

    let warning: string | undefined;
    let previousMechanicRemarks: string | null = null;

    await db.transaction(async (tx) => {
      // Fetch inspection (must not be draft, type return)
      const [inspection] = await tx
        .select({
          id: inspections.id,
          tenantId: inspections.tenantId,
          isDraft: inspections.isDraft,
          type: inspections.type,
          mechanicRemarks: inspections.mechanicRemarks,
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

      if (inspection.type !== "return") {
        throw new InspectionError("Ce constat n'est pas un constat de retour");
      }

      previousMechanicRemarks = inspection.mechanicRemarks;

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
          "Le contrat doit être actif pour modifier le constat de retour"
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
          mechanicRemarks: mechanicRemarks ?? null,
          clientSignatureUrl,
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
            isPreExisting: false,
          }))
        );
      }

      // Update contract returnMileage
      await tx
        .update(rentalContracts)
        .set({
          returnMileage: mileage,
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
          action: "return_inspection_updated",
          entityType: "inspection",
          entityId: inspectionId,
          changes: {
            contractId,
            mileage,
            fuelLevel,
            damageCount: damages.length,
            hasMechanicRemarks: !!mechanicRemarks,
          },
        },
        tx
      );
    });

    // Re-send mechanic email if remarks changed and non-empty
    const remarksChanged =
      mechanicRemarks && mechanicRemarks !== previousMechanicRemarks;

    if (remarksChanged) {
      warning = await resolveMechanicEmail({
        tenantId: currentUser.tenantId,
        contractId,
        mechanicRemarks,
        returnMileage: mileage,
      });
    }

    return { success: true, data: { inspectionId, warning } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    if (err instanceof InspectionError) {
      return { success: false, error: err.message };
    }
    console.error(
      "updateReturnInspection error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la modification du constat de retour",
    };
  }
}

// ============================================================================
// getReturnInspection
// ============================================================================

export async function getReturnInspection(
  contractId: string
): Promise<ActionResult<ReturnInspectionDetail | null>> {
  try {
    const currentUser = await requirePermission("inspections", "read");

    // Fetch return inspection for this contract
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
        mechanicRemarks: inspections.mechanicRemarks,
        conductedAt: inspections.conductedAt,
      })
      .from(inspections)
      .where(
        and(
          eq(inspections.contractId, contractId),
          eq(inspections.type, "return"),
          eq(inspections.tenantId, currentUser.tenantId)
        )
      );

    if (!inspection) {
      return { success: true, data: null };
    }

    // Fetch return inspection photos
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

    // Fetch return inspection damages
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

    // Fetch departure damages for comparison (single query with JOIN)
    const departureDamages: InspectionDamageDetail[] = await db
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
      .innerJoin(
        inspections,
        eq(inspectionDamages.inspectionId, inspections.id)
      )
      .where(
        and(
          eq(inspections.contractId, contractId),
          eq(inspections.type, "departure"),
          eq(inspections.tenantId, currentUser.tenantId)
        )
      );

    return {
      success: true,
      data: {
        ...inspection,
        photos,
        damages,
        departureDamages,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getReturnInspection error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement du constat de retour",
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
