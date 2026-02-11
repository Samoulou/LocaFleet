"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments, rentalDossiers } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import { processPaymentSchema } from "@/lib/validations/payment";
import { createAuditLog } from "@/actions/audit-logs";
import type { ActionResult } from "@/types";

// ============================================================================
// processPayment — manual receipt / quittancement
// ============================================================================

export async function processPayment(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("payments", "create");

    // 1. Validate input
    const parsed = processPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { invoiceId, amount, method, paidAt, reference, notes } = parsed.data;

    // 2. Fetch invoice (tenant-scoped)
    const [invoice] = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        contractId: invoices.contractId,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.tenantId, currentUser.tenantId)
        )
      );

    if (!invoice) {
      return { success: false, error: "Cette facture n'existe pas" };
    }

    // 3. Business rule: reject if status is not payable
    if (invoice.status === "paid") {
      return { success: false, error: "Cette facture est déjà payée" };
    }

    if (invoice.status !== "pending" && invoice.status !== "invoiced") {
      return {
        success: false,
        error: "Cette facture ne peut pas être quittancée",
      };
    }

    // 4. Transaction: insert payment + update invoice + update dossier + audit
    let paymentId = "";

    await db.transaction(async (tx) => {
      // Insert payment record
      const [payment] = await tx
        .insert(payments)
        .values({
          tenantId: currentUser.tenantId,
          invoiceId,
          processedByUserId: currentUser.id,
          amount: amount.toString(),
          method,
          reference: reference ?? null,
          paidAt,
          notes: notes ?? null,
        })
        .returning({ id: payments.id });

      paymentId = payment.id;

      // Update invoice status to "paid"
      await tx
        .update(invoices)
        .set({
          status: "paid",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.tenantId, currentUser.tenantId)
          )
        );

      // Update associated rental dossier status to "paid" (optional — may not exist)
      await tx
        .update(rentalDossiers)
        .set({
          status: "paid",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(rentalDossiers.contractId, invoice.contractId),
            eq(rentalDossiers.tenantId, currentUser.tenantId)
          )
        );

      // Audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "payment_processed",
          entityType: "invoice",
          entityId: invoiceId,
          changes: {
            paymentId,
            amount,
            method,
            paidAt,
            previousStatus: invoice.status,
            newStatus: "paid",
          },
        },
        tx
      );
    });

    return {
      success: true,
      data: { id: paymentId },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "processPayment error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du traitement du paiement",
    };
  }
}
