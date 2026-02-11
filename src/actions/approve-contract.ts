"use server";

import { eq, and, or, lt, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  rentalContracts,
  contractOptions,
  clients,
  vehicles,
  invoices,
  payments,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import { approveContractSchema } from "@/lib/validations/approve-contract";
import { createAuditLog } from "@/actions/audit-logs";
import type { ActionResult } from "@/types";

// ============================================================================
// Types
// ============================================================================

type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  type: "base_rental" | "option";
};

type DbLike = {
  select: typeof db.select;
  insert: typeof db.insert;
  update: typeof db.update;
  execute: typeof db.execute;
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
// generateNextInvoiceNumber — internal helper (same pattern as invoices.ts)
// ============================================================================

async function generateNextInvoiceNumber(
  tenantId: string,
  tx: DbLike
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `FAC-${currentYear}-`;

  const result = await tx.execute(
    sql`SELECT ${invoices.invoiceNumber} FROM ${invoices}
        WHERE ${invoices.tenantId} = ${tenantId}
        ORDER BY ${invoices.createdAt} DESC
        LIMIT 1
        FOR UPDATE`
  );

  const lastNumber = result[0]?.invoice_number as string | undefined;
  if (lastNumber && lastNumber.startsWith(prefix)) {
    const seqStr = lastNumber.slice(prefix.length);
    const nextSeq = parseInt(seqStr, 10) + 1;
    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  return `${prefix}0001`;
}

// ============================================================================
// approveContract
// ============================================================================

export async function approveContract(
  input: unknown
): Promise<
  ActionResult<{ contractId: string; invoiceId: string; invoiceNumber: string }>
> {
  try {
    const currentUser = await requirePermission("contracts", "update");

    // 1. Validate input
    const parsed = approveContractSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { contractId } = parsed.data;

    let invoiceId = "";
    let invoiceNumber = "";

    await db.transaction(async (tx) => {
      // 2. Fetch contract (tenant-scoped, must be draft)
      const [contract] = await tx
        .select({
          id: rentalContracts.id,
          tenantId: rentalContracts.tenantId,
          clientId: rentalContracts.clientId,
          vehicleId: rentalContracts.vehicleId,
          status: rentalContracts.status,
          startDate: rentalContracts.startDate,
          endDate: rentalContracts.endDate,
          dailyRate: rentalContracts.dailyRate,
          totalDays: rentalContracts.totalDays,
          baseAmount: rentalContracts.baseAmount,
          optionsAmount: rentalContracts.optionsAmount,
          totalAmount: rentalContracts.totalAmount,
          paymentMethod: rentalContracts.paymentMethod,
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

      if (contract.status !== "draft") {
        throw new ContractError(
          "Seuls les contrats en brouillon peuvent être approuvés"
        );
      }

      // 3. Double-check vehicle overlap (race condition guard)
      const overlapping = await tx
        .select({ id: rentalContracts.id })
        .from(rentalContracts)
        .where(
          and(
            eq(rentalContracts.vehicleId, contract.vehicleId),
            eq(rentalContracts.tenantId, currentUser.tenantId),
            or(
              eq(rentalContracts.status, "approved"),
              eq(rentalContracts.status, "pending_cg"),
              eq(rentalContracts.status, "active")
            ),
            lt(rentalContracts.startDate, contract.endDate),
            gt(rentalContracts.endDate, contract.startDate)
          )
        )
        .limit(1);

      if (overlapping.length > 0) {
        throw new ContractError(
          "Ce véhicule a déjà un contrat actif sur cette période"
        );
      }

      // 4. Check for duplicate invoice
      const [existingInvoice] = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.contractId, contractId),
            eq(invoices.tenantId, currentUser.tenantId)
          )
        );

      if (existingInvoice) {
        throw new ContractError("Une facture existe déjà pour ce contrat");
      }

      // 5. Fetch client to check isTrusted
      const [client] = await tx
        .select({ id: clients.id, isTrusted: clients.isTrusted })
        .from(clients)
        .where(
          and(
            eq(clients.id, contract.clientId),
            eq(clients.tenantId, currentUser.tenantId)
          )
        );

      if (!client) {
        throw new ContractError("Le client associé au contrat est introuvable");
      }

      // 6. Determine new status based on isTrusted
      const newStatus = client.isTrusted ? "pending_cg" : "approved";

      // 7. Update contract status
      await tx
        .update(rentalContracts)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(rentalContracts.id, contractId),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        );

      // 8. Update vehicle status → rented
      await tx
        .update(vehicles)
        .set({
          status: "rented",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(vehicles.id, contract.vehicleId),
            eq(vehicles.tenantId, currentUser.tenantId)
          )
        );

      // 9. Fetch contract options for invoice line items
      const options = await tx
        .select({
          name: contractOptions.name,
          dailyPrice: contractOptions.dailyPrice,
          quantity: contractOptions.quantity,
          totalPrice: contractOptions.totalPrice,
        })
        .from(contractOptions)
        .where(eq(contractOptions.contractId, contractId));

      // 10. Generate invoice number
      invoiceNumber = await generateNextInvoiceNumber(currentUser.tenantId, tx);

      // 11. Build line items
      const lineItems: InvoiceLineItem[] = [];

      lineItems.push({
        description: `Location véhicule (${contract.totalDays} jours × ${contract.dailyRate} CHF/jour)`,
        quantity: contract.totalDays,
        unitPrice: contract.dailyRate,
        totalPrice: contract.baseAmount,
        type: "base_rental",
      });

      for (const opt of options) {
        lineItems.push({
          description: opt.name,
          quantity: opt.quantity ?? 1,
          unitPrice: opt.dailyPrice,
          totalPrice: opt.totalPrice,
          type: "option",
        });
      }

      // 12. Calculate totals
      const subtotal =
        parseFloat(contract.baseAmount) +
        parseFloat(contract.optionsAmount ?? "0");
      const taxRate = 0;
      const taxAmount = 0;
      const totalAmount = subtotal + taxAmount;

      // 13. Determine invoice status based on payment method
      const invoiceStatus =
        contract.paymentMethod === "cash_departure" ? "paid" : "pending";

      // 14. Insert invoice
      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          tenantId: currentUser.tenantId,
          contractId,
          clientId: contract.clientId,
          invoiceNumber,
          status: invoiceStatus,
          subtotal: subtotal.toFixed(2),
          taxRate: taxRate.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          lineItems,
          issuedAt: new Date(),
        })
        .returning({ id: invoices.id });

      invoiceId = newInvoice.id;

      // 15. If cash_departure, create payment record
      if (contract.paymentMethod === "cash_departure") {
        await tx.insert(payments).values({
          tenantId: currentUser.tenantId,
          invoiceId,
          processedByUserId: currentUser.id,
          amount: totalAmount.toFixed(2),
          method: "cash_departure",
          paidAt: new Date(),
        });
      }

      // 16. Audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "contract_approved",
          entityType: "contract",
          entityId: contractId,
          changes: {
            newStatus,
            invoiceId,
            invoiceNumber,
            totalAmount: totalAmount.toFixed(2),
            paymentMethod: contract.paymentMethod,
          },
        },
        tx
      );
    });

    return {
      success: true,
      data: { contractId: parsed.data.contractId, invoiceId, invoiceNumber },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    if (err instanceof ContractError) {
      return { success: false, error: err.message };
    }
    console.error(
      "approveContract error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de l'approbation du contrat",
    };
  }
}
