"use server";

import { eq, and, isNull, or, sql, asc, lt, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  vehicles,
  vehicleCategories,
  clients,
  rentalContracts,
  contractOptions,
  rentalOptions,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import { createContractSchema } from "@/lib/validations/contracts";
import { computeRentalDays } from "@/lib/utils";
import { createAuditLog } from "@/actions/audit-logs";
import type { ActionResult } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type ClientSelectItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isTrusted: boolean;
};

export type RentalOptionItem = {
  id: string;
  name: string;
  dailyPrice: string;
  isPerDay: boolean | null;
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
// getClientsForTenant
// ============================================================================

export async function getClientsForTenant(): Promise<
  ActionResult<ClientSelectItem[]>
> {
  try {
    const currentUser = await requirePermission("contracts", "create");

    const data = await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        isTrusted: clients.isTrusted,
      })
      .from(clients)
      .where(
        and(
          eq(clients.tenantId, currentUser.tenantId),
          isNull(clients.deletedAt)
        )
      )
      .orderBy(asc(clients.lastName), asc(clients.firstName));

    return { success: true, data };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getClientsForTenant error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des clients",
    };
  }
}

// ============================================================================
// getRentalOptionsForTenant
// ============================================================================

export async function getRentalOptionsForTenant(): Promise<
  ActionResult<RentalOptionItem[]>
> {
  try {
    const currentUser = await requirePermission("contracts", "create");

    const data = await db
      .select({
        id: rentalOptions.id,
        name: rentalOptions.name,
        dailyPrice: rentalOptions.dailyPrice,
        isPerDay: rentalOptions.isPerDay,
      })
      .from(rentalOptions)
      .where(
        and(
          eq(rentalOptions.tenantId, currentUser.tenantId),
          eq(rentalOptions.isActive, true)
        )
      )
      .orderBy(asc(rentalOptions.sortOrder), asc(rentalOptions.name));

    return { success: true, data };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getRentalOptionsForTenant error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des options",
    };
  }
}

// ============================================================================
// generateNextContractNumber — internal helper
// ============================================================================

type DbLike = {
  select: typeof db.select;
  insert: typeof db.insert;
  update: typeof db.update;
  execute: typeof db.execute;
};

async function generateNextContractNumber(
  tenantId: string,
  tx: DbLike
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CTR-${currentYear}-`;

  // FOR UPDATE locks the row to prevent concurrent duplicates
  const result = await tx.execute(
    sql`SELECT ${rentalContracts.contractNumber} FROM ${rentalContracts}
        WHERE ${rentalContracts.tenantId} = ${tenantId}
        ORDER BY ${rentalContracts.createdAt} DESC
        LIMIT 1
        FOR UPDATE`
  );

  const lastNumber = result[0]?.contract_number as string | undefined;
  if (lastNumber && lastNumber.startsWith(prefix)) {
    const seqStr = lastNumber.slice(prefix.length);
    const nextSeq = parseInt(seqStr, 10) + 1;
    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  return `${prefix}0001`;
}

// ============================================================================
// createDraftContract
// ============================================================================

export async function createDraftContract(
  input: unknown
): Promise<ActionResult<{ id: string; contractNumber: string }>> {
  try {
    const currentUser = await requirePermission("contracts", "create");

    // 1. Validate input
    const parsed = createContractSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const {
      vehicleId,
      clientId,
      startDate,
      endDate,
      paymentMethod,
      selectedOptionIds,
      includedKmPerDay,
      excessKmRate,
      depositAmount,
      pickupLocation,
      returnLocation,
      notes,
    } = parsed.data;

    let contractId = "";
    let contractNumber = "";

    await db.transaction(async (tx) => {
      // 2. Verify vehicle exists, tenant-scoped, not soft-deleted
      const [vehicle] = await tx
        .select({
          id: vehicles.id,
          status: vehicles.status,
          dailyRateOverride: vehicles.dailyRateOverride,
          categoryId: vehicles.categoryId,
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
        throw new ContractError("Ce véhicule n'existe pas");
      }

      if (vehicle.status === "out_of_service") {
        throw new ContractError("Ce véhicule est hors service");
      }

      // 3. Date overlap check
      const overlapping = await tx
        .select({ id: rentalContracts.id })
        .from(rentalContracts)
        .where(
          and(
            eq(rentalContracts.vehicleId, vehicleId),
            eq(rentalContracts.tenantId, currentUser.tenantId),
            or(
              eq(rentalContracts.status, "draft"),
              eq(rentalContracts.status, "approved"),
              eq(rentalContracts.status, "pending_cg"),
              eq(rentalContracts.status, "active")
            ),
            // Overlap: existingStart < newEnd AND existingEnd > newStart
            lt(rentalContracts.startDate, endDate),
            gt(rentalContracts.endDate, startDate)
          )
        )
        .limit(1);

      if (overlapping.length > 0) {
        throw new ContractError(
          "Ce véhicule a déjà un contrat sur cette période"
        );
      }

      // 4. Verify client exists, tenant-scoped, not soft-deleted
      const [client] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.tenantId, currentUser.tenantId),
            isNull(clients.deletedAt)
          )
        );

      if (!client) {
        throw new ContractError("Ce client n'existe pas");
      }

      // 5. Resolve daily rate
      let dailyRate: number | null = null;

      if (vehicle.dailyRateOverride) {
        dailyRate = parseFloat(vehicle.dailyRateOverride);
      } else if (vehicle.categoryId) {
        const [category] = await tx
          .select({ dailyRate: vehicleCategories.dailyRate })
          .from(vehicleCategories)
          .where(
            and(
              eq(vehicleCategories.id, vehicle.categoryId),
              eq(vehicleCategories.tenantId, currentUser.tenantId)
            )
          );

        if (category?.dailyRate) {
          dailyRate = parseFloat(category.dailyRate);
        }
      }

      if (dailyRate === null || isNaN(dailyRate)) {
        throw new ContractError(
          "Aucun tarif journalier configuré pour ce véhicule"
        );
      }

      // 6. Calculate amounts
      const rental = computeRentalDays(startDate, endDate);
      if (!rental) {
        throw new ContractError("Les dates de début et fin sont invalides");
      }
      const totalDays = rental.billedDays;
      const baseAmount = dailyRate * totalDays;

      // 7. Fetch selected rental options and calculate totals
      let optionsAmount = 0;
      const optionsToInsert: Array<{
        rentalOptionId: string;
        name: string;
        dailyPrice: string;
        isPerDay: boolean | null;
        totalPrice: number;
      }> = [];

      if (selectedOptionIds.length > 0) {
        const availableOptions = await tx
          .select({
            id: rentalOptions.id,
            name: rentalOptions.name,
            dailyPrice: rentalOptions.dailyPrice,
            isPerDay: rentalOptions.isPerDay,
          })
          .from(rentalOptions)
          .where(
            and(
              eq(rentalOptions.tenantId, currentUser.tenantId),
              eq(rentalOptions.isActive, true),
              inArray(rentalOptions.id, selectedOptionIds)
            )
          );

        for (const optId of selectedOptionIds) {
          const opt = availableOptions.find((o) => o.id === optId);
          if (opt) {
            const price = parseFloat(opt.dailyPrice);
            const total = opt.isPerDay ? price * totalDays : price;
            optionsAmount += total;
            optionsToInsert.push({
              rentalOptionId: opt.id,
              name: opt.name,
              dailyPrice: opt.dailyPrice,
              isPerDay: opt.isPerDay,
              totalPrice: total,
            });
          }
        }
      }

      const totalAmount = baseAmount + optionsAmount;

      // 8. Generate contract number
      contractNumber = await generateNextContractNumber(
        currentUser.tenantId,
        tx
      );

      // 9. Insert rental contract
      const [newContract] = await tx
        .insert(rentalContracts)
        .values({
          tenantId: currentUser.tenantId,
          contractNumber,
          clientId,
          vehicleId,
          createdByUserId: currentUser.id,
          status: "draft",
          startDate,
          endDate,
          dailyRate: dailyRate.toFixed(2),
          totalDays,
          baseAmount: baseAmount.toFixed(2),
          optionsAmount: optionsAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          depositAmount: depositAmount?.toFixed(2) ?? null,
          includedKmPerDay: includedKmPerDay ?? null,
          excessKmRate: excessKmRate?.toFixed(2) ?? null,
          pickupLocation: pickupLocation ?? null,
          returnLocation: returnLocation ?? null,
          paymentMethod: paymentMethod,
          notes: notes ?? null,
        })
        .returning({ id: rentalContracts.id });

      contractId = newContract.id;

      // 10. Insert contract options (snapshot)
      if (optionsToInsert.length > 0) {
        await tx.insert(contractOptions).values(
          optionsToInsert.map((opt) => ({
            contractId,
            rentalOptionId: opt.rentalOptionId,
            name: opt.name,
            dailyPrice: opt.dailyPrice,
            quantity: 1,
            totalPrice: opt.totalPrice.toFixed(2),
          }))
        );
      }

      // 11. Audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "contract_draft_created",
          entityType: "contract",
          entityId: contractId,
          changes: {
            contractNumber,
            vehicleId,
            clientId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalDays,
            dailyRate: dailyRate.toFixed(2),
            baseAmount: baseAmount.toFixed(2),
            optionsAmount: optionsAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
          },
        },
        tx
      );
    });

    return {
      success: true,
      data: { id: contractId, contractNumber },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    if (err instanceof ContractError) {
      return { success: false, error: err.message };
    }
    console.error(
      "createDraftContract error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la création du contrat",
    };
  }
}
