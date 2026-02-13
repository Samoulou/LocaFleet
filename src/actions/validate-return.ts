"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  rentalContracts,
  inspections,
  inspectionDamages,
  invoices,
  vehicles,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import { validateReturnSchema } from "@/lib/validations/validate-return";
import { createAuditLog } from "@/actions/audit-logs";
import type { ActionResult } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type ValidateReturnResult = {
  contractId: string;
  excessKm: number;
  excessKmAmount: number;
  damagesAmount: number;
  totalAmount: number;
};

export type ReturnValidationPreview = {
  contractId: string;
  contractNumber: string;
  departureMileage: number;
  returnMileage: number;
  totalKmDriven: number;
  includedKmPerDay: number | null;
  totalDays: number;
  includedKm: number;
  excessKm: number;
  excessKmRate: string | null;
  excessKmAmount: number;
  baseAmount: string;
  optionsAmount: string;
  currentTotalAmount: string;
  newDamages: Array<{
    id: string;
    zone: string;
    type: string;
    severity: string;
    description: string | null;
  }>;
  newDamagesCount: number;
};

type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  type: "base_rental" | "option" | "excess_km" | "damages";
};

// ============================================================================
// ContractError — business logic error (not auth)
// ============================================================================

class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

// ============================================================================
// calculateExcessKm — pure helper
// ============================================================================

function calculateExcessKm(params: {
  departureMileage: number;
  returnMileage: number;
  includedKmPerDay: number | null;
  excessKmRate: string | null;
  totalDays: number;
}): { excessKm: number; excessKmAmount: number } {
  if (params.includedKmPerDay === null || params.excessKmRate === null) {
    return { excessKm: 0, excessKmAmount: 0 };
  }

  const totalKmDriven = params.returnMileage - params.departureMileage;
  const includedKm = params.includedKmPerDay * params.totalDays;
  const excessKm = Math.max(0, totalKmDriven - includedKm);
  const excessKmAmount = excessKm * parseFloat(params.excessKmRate);

  return { excessKm, excessKmAmount };
}

// ============================================================================
// validateReturn
// ============================================================================

export async function validateReturn(
  input: unknown
): Promise<ActionResult<ValidateReturnResult>> {
  try {
    const currentUser = await requirePermission("contracts", "update");

    // 1. Validate input
    const parsed = validateReturnSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { contractId, damagesAmount } = parsed.data;

    let resultData: ValidateReturnResult | null = null;

    await db.transaction(async (tx) => {
      // 2. Fetch contract (tenant-scoped)
      const [contract] = await tx
        .select({
          id: rentalContracts.id,
          tenantId: rentalContracts.tenantId,
          vehicleId: rentalContracts.vehicleId,
          status: rentalContracts.status,
          departureMileage: rentalContracts.departureMileage,
          returnMileage: rentalContracts.returnMileage,
          includedKmPerDay: rentalContracts.includedKmPerDay,
          excessKmRate: rentalContracts.excessKmRate,
          totalDays: rentalContracts.totalDays,
          baseAmount: rentalContracts.baseAmount,
          optionsAmount: rentalContracts.optionsAmount,
        })
        .from(rentalContracts)
        .where(
          and(
            eq(rentalContracts.id, contractId),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        );

      if (!contract) {
        throw new ContractError("Ce contrat n'existe pas");
      }

      if (contract.status !== "active") {
        throw new ContractError(
          "Seuls les contrats actifs peuvent être validés au retour"
        );
      }

      // 3. Verify returnMileage is set and valid
      if (contract.returnMileage === null) {
        throw new ContractError(
          "Le kilométrage de retour n'est pas renseigné. Veuillez d'abord soumettre le constat de retour."
        );
      }

      if (contract.departureMileage === null) {
        throw new ContractError("Le kilométrage de départ n'est pas renseigné");
      }

      if (contract.returnMileage < contract.departureMileage) {
        throw new ContractError(
          "Le kilométrage de retour ne peut pas être inférieur au kilométrage de départ"
        );
      }

      // 4. Verify submitted return inspection exists
      const [returnInspection] = await tx
        .select({ id: inspections.id, isDraft: inspections.isDraft })
        .from(inspections)
        .where(
          and(
            eq(inspections.contractId, contractId),
            eq(inspections.type, "return"),
            eq(inspections.tenantId, currentUser.tenantId)
          )
        );

      if (!returnInspection || returnInspection.isDraft) {
        throw new ContractError(
          "Un constat de retour validé est requis avant la clôture du contrat"
        );
      }

      // 5. Calculate excess km
      const { excessKm, excessKmAmount } = calculateExcessKm({
        departureMileage: contract.departureMileage,
        returnMileage: contract.returnMileage,
        includedKmPerDay: contract.includedKmPerDay,
        excessKmRate: contract.excessKmRate,
        totalDays: contract.totalDays,
      });

      // 6. Calculate new total
      const baseAmount = parseFloat(contract.baseAmount);
      const optionsAmount = parseFloat(contract.optionsAmount ?? "0");
      const totalAmount =
        baseAmount + optionsAmount + excessKmAmount + damagesAmount;

      // 7. Update contract
      const now = new Date();
      await tx
        .update(rentalContracts)
        .set({
          status: "completed",
          actualReturnDate: now,
          archivedAt: now,
          excessKmAmount: excessKmAmount.toFixed(2),
          damagesAmount: damagesAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          updatedAt: now,
        })
        .where(
          and(
            eq(rentalContracts.id, contractId),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        );

      // 8. Update existing invoice — add excess_km and damages line items
      const [existingInvoice] = await tx
        .select({
          id: invoices.id,
          lineItems: invoices.lineItems,
          subtotal: invoices.subtotal,
          taxRate: invoices.taxRate,
          taxAmount: invoices.taxAmount,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.contractId, contractId),
            eq(invoices.tenantId, currentUser.tenantId)
          )
        );

      if (existingInvoice) {
        const rawLineItems = existingInvoice.lineItems;
        const currentLineItems: InvoiceLineItem[] = Array.isArray(rawLineItems)
          ? (rawLineItems as InvoiceLineItem[])
          : [];
        const updatedLineItems = [...currentLineItems];

        if (excessKm > 0 && excessKmAmount > 0) {
          updatedLineItems.push({
            description: `Kilometres supplementaires (${excessKm} km x ${contract.excessKmRate} CHF/km)`,
            quantity: excessKm,
            unitPrice: contract.excessKmRate ?? "0",
            totalPrice: excessKmAmount.toFixed(2),
            type: "excess_km",
          });
        }

        if (damagesAmount > 0) {
          updatedLineItems.push({
            description: "Franchise degats",
            quantity: 1,
            unitPrice: damagesAmount.toFixed(2),
            totalPrice: damagesAmount.toFixed(2),
            type: "damages",
          });
        }

        const newSubtotal =
          parseFloat(existingInvoice.subtotal) + excessKmAmount + damagesAmount;
        const taxRate = parseFloat(existingInvoice.taxRate ?? "0");
        const newTaxAmount = newSubtotal * (taxRate / 100);
        const newInvoiceTotal = newSubtotal + newTaxAmount;

        await tx
          .update(invoices)
          .set({
            lineItems: updatedLineItems,
            subtotal: newSubtotal.toFixed(2),
            taxAmount: newTaxAmount.toFixed(2),
            totalAmount: newInvoiceTotal.toFixed(2),
            updatedAt: now,
          })
          .where(
            and(
              eq(invoices.id, existingInvoice.id),
              eq(invoices.tenantId, currentUser.tenantId)
            )
          );
      }

      // 9. Update vehicle: available + mileage
      await tx
        .update(vehicles)
        .set({
          status: "available",
          mileage: contract.returnMileage,
          updatedAt: now,
        })
        .where(
          and(
            eq(vehicles.id, contract.vehicleId),
            eq(vehicles.tenantId, currentUser.tenantId)
          )
        );

      // 10. Audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "contract_return_validated",
          entityType: "contract",
          entityId: contractId,
          changes: {
            excessKm,
            excessKmAmount: excessKmAmount.toFixed(2),
            damagesAmount: damagesAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            returnMileage: contract.returnMileage,
          },
        },
        tx
      );

      resultData = {
        contractId,
        excessKm,
        excessKmAmount,
        damagesAmount,
        totalAmount,
      };
    });

    if (!resultData) {
      return {
        success: false,
        error: "Une erreur inattendue est survenue lors de la validation",
      };
    }

    return { success: true, data: resultData };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    if (err instanceof ContractError) {
      return { success: false, error: err.message };
    }
    console.error(
      "validateReturn error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la validation du retour",
    };
  }
}

// ============================================================================
// getReturnValidationPreview
// ============================================================================

export async function getReturnValidationPreview(
  contractId: string
): Promise<ActionResult<ReturnValidationPreview>> {
  try {
    const currentUser = await requirePermission("contracts", "read");

    // Validate UUID
    if (
      !contractId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        contractId
      )
    ) {
      return {
        success: false,
        error: "L'identifiant du contrat est invalide",
      };
    }

    // 1. Fetch contract
    const [contract] = await db
      .select({
        id: rentalContracts.id,
        contractNumber: rentalContracts.contractNumber,
        status: rentalContracts.status,
        departureMileage: rentalContracts.departureMileage,
        returnMileage: rentalContracts.returnMileage,
        includedKmPerDay: rentalContracts.includedKmPerDay,
        excessKmRate: rentalContracts.excessKmRate,
        totalDays: rentalContracts.totalDays,
        baseAmount: rentalContracts.baseAmount,
        optionsAmount: rentalContracts.optionsAmount,
        totalAmount: rentalContracts.totalAmount,
      })
      .from(rentalContracts)
      .where(
        and(
          eq(rentalContracts.id, contractId),
          eq(rentalContracts.tenantId, currentUser.tenantId)
        )
      );

    if (!contract) {
      return { success: false, error: "Ce contrat n'existe pas" };
    }

    if (contract.status !== "active") {
      return {
        success: false,
        error: "Seuls les contrats actifs peuvent être prévisualisés",
      };
    }

    if (contract.departureMileage === null || contract.returnMileage === null) {
      return {
        success: false,
        error: "Les kilométrages de départ et retour doivent être renseignés",
      };
    }

    // 2. Fetch return inspection damages (isPreExisting = false)
    const newDamages = await db
      .select({
        id: inspectionDamages.id,
        zone: inspectionDamages.zone,
        type: inspectionDamages.type,
        severity: inspectionDamages.severity,
        description: inspectionDamages.description,
      })
      .from(inspectionDamages)
      .innerJoin(
        inspections,
        eq(inspectionDamages.inspectionId, inspections.id)
      )
      .where(
        and(
          eq(inspections.contractId, contractId),
          eq(inspections.type, "return"),
          eq(inspections.tenantId, currentUser.tenantId),
          eq(inspectionDamages.isPreExisting, false)
        )
      );

    // 3. Calculate excess km
    const totalKmDriven = contract.returnMileage - contract.departureMileage;
    const includedKm =
      contract.includedKmPerDay !== null
        ? contract.includedKmPerDay * contract.totalDays
        : 0;

    const { excessKm, excessKmAmount } = calculateExcessKm({
      departureMileage: contract.departureMileage,
      returnMileage: contract.returnMileage,
      includedKmPerDay: contract.includedKmPerDay,
      excessKmRate: contract.excessKmRate,
      totalDays: contract.totalDays,
    });

    return {
      success: true,
      data: {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        departureMileage: contract.departureMileage,
        returnMileage: contract.returnMileage,
        totalKmDriven,
        includedKmPerDay: contract.includedKmPerDay,
        totalDays: contract.totalDays,
        includedKm,
        excessKm,
        excessKmRate: contract.excessKmRate,
        excessKmAmount,
        baseAmount: contract.baseAmount,
        optionsAmount: contract.optionsAmount ?? "0",
        currentTotalAmount: contract.totalAmount,
        newDamages,
        newDamagesCount: newDamages.length,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getReturnValidationPreview error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors du chargement de la prévisualisation",
    };
  }
}
