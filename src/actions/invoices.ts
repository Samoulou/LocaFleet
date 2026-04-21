"use server";

import {
  eq,
  and,
  or,
  ilike,
  gte,
  lt,
  count,
  desc,
  sql,
  isNull,
} from "drizzle-orm";
import { db } from "@/db";
import {
  rentalContracts,
  contractOptions,
  invoices,
  rentalDossiers,
  vehicles,
  clients,
  payments,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  closeContractSchema,
  invoiceListParamsSchema,
  updateInvoiceStatusSchema,
} from "@/lib/validations/invoices";
import { createAuditLog } from "@/actions/audit-logs";
import type {
  ActionResult,
  InvoiceStatus,
  InvoiceDetail,
  InvoiceLineItem,
} from "@/types";

// ============================================================================
// Types
// ============================================================================

type DbLike = {
  select: typeof db.select;
  insert: typeof db.insert;
  update: typeof db.update;
  execute: typeof db.execute;
};

// ============================================================================
// generateNextInvoiceNumber — internal helper
// ============================================================================

async function generateNextInvoiceNumber(
  tenantId: string,
  tx: DbLike
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `FAC-${currentYear}-`;

  // FOR UPDATE locks the row to prevent concurrent duplicates
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
// generateNextDossierNumber — internal helper
// ============================================================================

async function generateNextDossierNumber(
  tenantId: string,
  tx: DbLike
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `DOS-${currentYear}-`;

  // FOR UPDATE locks the row to prevent concurrent duplicates
  const result = await tx.execute(
    sql`SELECT ${rentalDossiers.dossierNumber} FROM ${rentalDossiers}
        WHERE ${rentalDossiers.tenantId} = ${tenantId}
        ORDER BY ${rentalDossiers.createdAt} DESC
        LIMIT 1
        FOR UPDATE`
  );

  const lastNumber = result[0]?.dossier_number as string | undefined;
  if (lastNumber && lastNumber.startsWith(prefix)) {
    const seqStr = lastNumber.slice(prefix.length);
    const nextSeq = parseInt(seqStr, 10) + 1;
    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  return `${prefix}0001`;
}

// ============================================================================
// closeContractAndGenerateInvoice
// ============================================================================

export async function closeContractAndGenerateInvoice(
  input: unknown
): Promise<ActionResult<{ invoiceId: string; contractId: string }>> {
  try {
    const currentUser = await requirePermission("contracts", "update");

    // 1. Validate input
    const parsed = closeContractSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const {
      contractId,
      actualReturnDate,
      returnMileage,
      damagesAmount,
      notes,
    } = parsed.data;

    let invoiceId = "";

    await db.transaction(async (tx) => {
      // 2. Fetch contract (tenant-scoped, must be active)
      const [contract] = await tx
        .select({
          id: rentalContracts.id,
          tenantId: rentalContracts.tenantId,
          clientId: rentalContracts.clientId,
          vehicleId: rentalContracts.vehicleId,
          status: rentalContracts.status,
          startDate: rentalContracts.startDate,
          endDate: rentalContracts.endDate,
          departureMileage: rentalContracts.departureMileage,
          includedKmPerDay: rentalContracts.includedKmPerDay,
          excessKmRate: rentalContracts.excessKmRate,
          dailyRate: rentalContracts.dailyRate,
          totalDays: rentalContracts.totalDays,
          baseAmount: rentalContracts.baseAmount,
          optionsAmount: rentalContracts.optionsAmount,
          contractPdfUrl: rentalContracts.contractPdfUrl,
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
          "Seuls les contrats actifs peuvent être clôturés"
        );
      }

      // Check for duplicate invoice
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

      // 3. Fetch contract options (join with contract to verify tenant ownership)
      const options = await tx
        .select({
          name: contractOptions.name,
          dailyPrice: contractOptions.dailyPrice,
          quantity: contractOptions.quantity,
          totalPrice: contractOptions.totalPrice,
        })
        .from(contractOptions)
        .innerJoin(
          rentalContracts,
          eq(contractOptions.contractId, rentalContracts.id)
        )
        .where(
          and(
            eq(contractOptions.contractId, contractId),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        );

      // 4. Generate invoice number
      const invoiceNumber = await generateNextInvoiceNumber(
        currentUser.tenantId,
        tx
      );

      // 5. Build line items
      const lineItems: InvoiceLineItem[] = [];

      // Base rental line item
      lineItems.push({
        description: `Location véhicule (${contract.totalDays} jours × ${contract.dailyRate} CHF/jour)`,
        quantity: contract.totalDays,
        unitPrice: contract.dailyRate,
        totalPrice: contract.baseAmount,
        type: "base_rental",
      });

      // Option line items
      for (const opt of options) {
        lineItems.push({
          description: opt.name,
          quantity: opt.quantity ?? 1,
          unitPrice: opt.dailyPrice,
          totalPrice: opt.totalPrice,
          type: "option",
        });
      }

      // 6. Calculate excess km
      let excessKmAmount = 0;
      let excessKm = 0;

      if (
        contract.departureMileage !== null &&
        contract.includedKmPerDay !== null &&
        contract.excessKmRate !== null
      ) {
        const totalKmDriven = returnMileage - contract.departureMileage;
        const includedKm = contract.includedKmPerDay * contract.totalDays;
        excessKm = totalKmDriven - includedKm;

        if (excessKm > 0) {
          const rate = parseFloat(contract.excessKmRate);
          excessKmAmount = excessKm * rate;

          lineItems.push({
            description: `Kilomètres supplémentaires (${excessKm} km × ${contract.excessKmRate} CHF/km)`,
            quantity: excessKm,
            unitPrice: contract.excessKmRate,
            totalPrice: excessKmAmount.toFixed(2),
            type: "excess_km",
          });
        }
      }

      // 7. Damages line item
      if (damagesAmount > 0) {
        lineItems.push({
          description: "Franchise dégâts",
          quantity: 1,
          unitPrice: damagesAmount.toFixed(2),
          totalPrice: damagesAmount.toFixed(2),
          type: "damages",
        });
      }

      // 8. Calculate totals
      const subtotal =
        parseFloat(contract.baseAmount) +
        parseFloat(contract.optionsAmount ?? "0") +
        excessKmAmount +
        damagesAmount;

      const taxRate = 0;
      const taxAmount = 0;
      const totalAmount = subtotal + taxAmount;

      // 9. Update contract
      await tx
        .update(rentalContracts)
        .set({
          status: "completed",
          actualReturnDate,
          returnMileage,
          excessKmAmount: excessKmAmount.toFixed(2),
          damagesAmount: damagesAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          notes: notes ?? rentalContracts.notes,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(rentalContracts.id, contractId),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        );

      // 10. Insert invoice
      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          tenantId: currentUser.tenantId,
          contractId,
          clientId: contract.clientId,
          invoiceNumber,
          status: "pending",
          subtotal: subtotal.toFixed(2),
          taxRate: taxRate.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          lineItems,
          issuedAt: new Date(),
          notes: notes ?? null,
        })
        .returning({ id: invoices.id });

      invoiceId = newInvoice.id;

      // 11. Fetch client for dossier info
      const [client] = await tx
        .select({
          firstName: clients.firstName,
          lastName: clients.lastName,
        })
        .from(clients)
        .where(
          and(
            eq(clients.id, contract.clientId),
            eq(clients.tenantId, currentUser.tenantId)
          )
        );

      // 12. Fetch vehicle for dossier info
      const [vehicle] = await tx
        .select({
          brand: vehicles.brand,
          model: vehicles.model,
          plateNumber: vehicles.plateNumber,
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.id, contract.vehicleId),
            eq(vehicles.tenantId, currentUser.tenantId)
          )
        );

      // 13. Insert rental dossier
      const dossierNumber = await generateNextDossierNumber(
        currentUser.tenantId,
        tx
      );

      const formatDate = (d: Date) => {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
      };

      const rentalPeriod = `${formatDate(contract.startDate)} — ${formatDate(actualReturnDate)}`;
      const clientName = client
        ? `${client.firstName} ${client.lastName}`
        : "Client inconnu";
      const vehicleInfo = vehicle
        ? `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber})`
        : "Véhicule inconnu";

      await tx.insert(rentalDossiers).values({
        tenantId: currentUser.tenantId,
        contractId,
        invoiceId,
        dossierNumber,
        status: "to_invoice",
        clientName,
        vehicleInfo,
        rentalPeriod,
        totalAmount: totalAmount.toFixed(2),
        contractPdfUrl: contract.contractPdfUrl,
      });

      // 14. Update vehicle status to available
      await tx
        .update(vehicles)
        .set({
          status: "available",
          mileage: returnMileage,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(vehicles.id, contract.vehicleId),
            eq(vehicles.tenantId, currentUser.tenantId)
          )
        );

      // 15. Audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "contract_closed",
          entityType: "contract",
          entityId: contractId,
          changes: {
            invoiceId,
            invoiceNumber,
            totalAmount: totalAmount.toFixed(2),
            returnMileage,
            excessKm: excessKm > 0 ? excessKm : 0,
            damagesAmount: damagesAmount.toFixed(2),
          },
        },
        tx
      );
    });

    return {
      success: true,
      data: { invoiceId, contractId: parsed.data.contractId },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    if (err instanceof ContractError) {
      return { success: false, error: err.message };
    }
    console.error(
      "closeContractAndGenerateInvoice error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la clôture du contrat",
    };
  }
}

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
// Invoice List Types
// ============================================================================

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  totalAmount: string;
  subtotal: string;
  taxAmount: string | null;
  issuedAt: Date | null;
  dueDate: string | null;
  createdAt: Date;
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  contractId: string;
  contractNumber: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehiclePlateNumber: string | null;
};

export type InvoiceListResult = {
  invoices: InvoiceListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type InvoiceStatusCounts = Record<InvoiceStatus, number>;

// ============================================================================
// listInvoices
// ============================================================================

function getPeriodRange(period: string): { start: Date; end?: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case "this_month":
      return { start: new Date(year, month, 1) };
    case "last_month":
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 1),
      };
    case "this_quarter": {
      const quarterStart = Math.floor(month / 3) * 3;
      return { start: new Date(year, quarterStart, 1) };
    }
    case "this_year":
      return { start: new Date(year, 0, 1) };
    default:
      return { start: new Date(year, month, 1) };
  }
}

export async function listInvoices(
  input: unknown
): Promise<ActionResult<InvoiceListResult>> {
  try {
    const currentUser = await requirePermission("invoices", "read");

    const parsed = invoiceListParamsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { page, pageSize, status, search, period } = parsed.data;
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions = [eq(invoices.tenantId, currentUser.tenantId)];

    if (status) {
      conditions.push(eq(invoices.status, status));
    }

    if (search) {
      const escaped = search.replace(/[%_\\]/g, "\\$&");
      const pattern = `%${escaped}%`;
      conditions.push(
        or(
          ilike(invoices.invoiceNumber, pattern),
          ilike(clients.firstName, pattern),
          ilike(clients.lastName, pattern)
        )!
      );
    }

    if (period) {
      const { start, end } = getPeriodRange(period);
      conditions.push(gte(invoices.createdAt, start));
      if (end) {
        conditions.push(lt(invoices.createdAt, end));
      }
    }

    const whereClause = and(...conditions);

    // Execute data + count queries in parallel
    const [data, countResult] = await Promise.all([
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          totalAmount: invoices.totalAmount,
          subtotal: invoices.subtotal,
          taxAmount: invoices.taxAmount,
          issuedAt: invoices.issuedAt,
          dueDate: invoices.dueDate,
          createdAt: invoices.createdAt,
          clientId: invoices.clientId,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
          contractId: invoices.contractId,
          contractNumber: rentalContracts.contractNumber,
          vehicleBrand: vehicles.brand,
          vehicleModel: vehicles.model,
          vehiclePlateNumber: vehicles.plateNumber,
        })
        .from(invoices)
        .leftJoin(
          clients,
          and(
            eq(invoices.clientId, clients.id),
            eq(clients.tenantId, currentUser.tenantId)
          )
        )
        .leftJoin(
          rentalContracts,
          and(
            eq(invoices.contractId, rentalContracts.id),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        )
        .leftJoin(
          vehicles,
          and(
            eq(rentalContracts.vehicleId, vehicles.id),
            eq(vehicles.tenantId, currentUser.tenantId)
          )
        )
        .where(whereClause)
        .orderBy(desc(invoices.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ value: count() })
        .from(invoices)
        .leftJoin(
          clients,
          and(
            eq(invoices.clientId, clients.id),
            eq(clients.tenantId, currentUser.tenantId)
          )
        )
        .where(whereClause),
    ]);

    const totalCount = countResult[0]?.value ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      data: {
        invoices: data.map((row) => ({
          id: row.id,
          invoiceNumber: row.invoiceNumber,
          status: row.status,
          totalAmount: row.totalAmount,
          subtotal: row.subtotal,
          taxAmount: row.taxAmount,
          issuedAt: row.issuedAt,
          dueDate: row.dueDate,
          createdAt: row.createdAt,
          clientId: row.clientId,
          clientFirstName: row.clientFirstName ?? "",
          clientLastName: row.clientLastName ?? "",
          contractId: row.contractId,
          contractNumber: row.contractNumber ?? null,
          vehicleBrand: row.vehicleBrand ?? null,
          vehicleModel: row.vehicleModel ?? null,
          vehiclePlateNumber: row.vehiclePlateNumber ?? null,
        })),
        totalCount,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "listInvoices error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des factures",
    };
  }
}

// ============================================================================
// getInvoiceStatusCounts
// ============================================================================

export async function getInvoiceStatusCounts(): Promise<
  ActionResult<InvoiceStatusCounts>
> {
  try {
    const currentUser = await requirePermission("invoices", "read");

    const [result] = await db
      .select({
        pending:
          sql<number>`count(*) filter (where ${invoices.status} = 'pending')`.mapWith(
            Number
          ),
        invoiced:
          sql<number>`count(*) filter (where ${invoices.status} = 'invoiced')`.mapWith(
            Number
          ),
        verification:
          sql<number>`count(*) filter (where ${invoices.status} = 'verification')`.mapWith(
            Number
          ),
        paid: sql<number>`count(*) filter (where ${invoices.status} = 'paid')`.mapWith(
          Number
        ),
        conflict:
          sql<number>`count(*) filter (where ${invoices.status} = 'conflict')`.mapWith(
            Number
          ),
        cancelled:
          sql<number>`count(*) filter (where ${invoices.status} = 'cancelled')`.mapWith(
            Number
          ),
      })
      .from(invoices)
      .where(eq(invoices.tenantId, currentUser.tenantId));

    return {
      success: true,
      data: {
        pending: result?.pending ?? 0,
        invoiced: result?.invoiced ?? 0,
        verification: result?.verification ?? 0,
        paid: result?.paid ?? 0,
        conflict: result?.conflict ?? 0,
        cancelled: result?.cancelled ?? 0,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getInvoiceStatusCounts error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors du chargement des compteurs de factures",
    };
  }
}

// ============================================================================
// getInvoiceById
// ============================================================================

export async function getInvoiceById(
  invoiceId: string
): Promise<ActionResult<InvoiceDetail>> {
  try {
    const currentUser = await requirePermission("invoices", "read");

    // 1. Fetch invoice + payments in parallel (both tenant-scoped)
    const [invoiceRows, invoicePayments] = await Promise.all([
      db
        .select({
          // Invoice fields
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          subtotal: invoices.subtotal,
          taxRate: invoices.taxRate,
          taxAmount: invoices.taxAmount,
          totalAmount: invoices.totalAmount,
          lineItems: invoices.lineItems,
          invoicePdfUrl: invoices.invoicePdfUrl,
          issuedAt: invoices.issuedAt,
          dueDate: invoices.dueDate,
          notes: invoices.notes,
          createdAt: invoices.createdAt,
          // Client fields
          clientId: clients.id,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
          clientEmail: clients.email,
          clientPhone: clients.phone,
          // Contract fields
          contractId: rentalContracts.id,
          contractNumber: rentalContracts.contractNumber,
          contractStartDate: rentalContracts.startDate,
          contractEndDate: rentalContracts.endDate,
          // Vehicle fields
          vehicleId: vehicles.id,
          vehicleBrand: vehicles.brand,
          vehicleModel: vehicles.model,
          vehiclePlateNumber: vehicles.plateNumber,
        })
        .from(invoices)
        .innerJoin(
          clients,
          and(
            eq(invoices.clientId, clients.id),
            eq(clients.tenantId, currentUser.tenantId),
            isNull(clients.deletedAt)
          )
        )
        .innerJoin(
          rentalContracts,
          and(
            eq(invoices.contractId, rentalContracts.id),
            eq(rentalContracts.tenantId, currentUser.tenantId)
          )
        )
        .innerJoin(
          vehicles,
          and(
            eq(rentalContracts.vehicleId, vehicles.id),
            eq(vehicles.tenantId, currentUser.tenantId),
            isNull(vehicles.deletedAt)
          )
        )
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.tenantId, currentUser.tenantId)
          )
        ),
      db
        .select({
          id: payments.id,
          amount: payments.amount,
          method: payments.method,
          reference: payments.reference,
          paidAt: payments.paidAt,
          notes: payments.notes,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(
          and(
            eq(payments.invoiceId, invoiceId),
            eq(payments.tenantId, currentUser.tenantId)
          )
        )
        .orderBy(desc(payments.paidAt)),
    ]);

    const row = invoiceRows[0];
    if (!row) {
      return { success: false, error: "Cette facture n'existe pas" };
    }

    // 3. Calculate totals
    const totalPaid = invoicePayments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0
    );
    const balance = parseFloat(row.totalAmount) - totalPaid;

    // 4. Cast lineItems from jsonb
    const lineItems = (row.lineItems ?? []) as InvoiceLineItem[];

    return {
      success: true,
      data: {
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        status: row.status,
        subtotal: row.subtotal,
        taxRate: row.taxRate ?? "0",
        taxAmount: row.taxAmount ?? "0",
        totalAmount: row.totalAmount,
        lineItems,
        invoicePdfUrl: row.invoicePdfUrl,
        issuedAt: row.issuedAt,
        dueDate: row.dueDate,
        notes: row.notes,
        createdAt: row.createdAt,
        client: {
          id: row.clientId,
          firstName: row.clientFirstName,
          lastName: row.clientLastName,
          email: row.clientEmail,
          phone: row.clientPhone,
        },
        vehicle: {
          id: row.vehicleId,
          brand: row.vehicleBrand,
          model: row.vehicleModel,
          plateNumber: row.vehiclePlateNumber,
        },
        contract: {
          id: row.contractId,
          contractNumber: row.contractNumber,
          startDate: row.contractStartDate,
          endDate: row.contractEndDate,
        },
        payments: invoicePayments,
        totalPaid,
        balance,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getInvoiceById error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement de la facture",
    };
  }
}

// ============================================================================
// updateInvoiceStatus
// ============================================================================

const ALLOWED_TRANSITIONS: Record<string, InvoiceStatus[]> = {
  pending: ["invoiced", "cancelled"],
  invoiced: ["cancelled"],
};

export async function updateInvoiceStatus(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("invoices", "update");

    // 1. Validate input
    const parsed = updateInvoiceStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { invoiceId, newStatus } = parsed.data;

    // 2. Transaction: SELECT + validate + UPDATE (avoids TOCTOU race)
    const result = await db.transaction(async (tx) => {
      // Fetch current invoice inside transaction (tenant-scoped)
      const [invoice] = await tx
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
        return { success: false as const, error: "Cette facture n'existe pas" };
      }

      // Validate transition
      const allowed = ALLOWED_TRANSITIONS[invoice.status];
      if (!allowed || !allowed.includes(newStatus)) {
        return {
          success: false as const,
          error: `Transition de statut non autorisée : ${invoice.status} → ${newStatus}`,
        };
      }

      // Update invoice status
      await tx
        .update(invoices)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.tenantId, currentUser.tenantId)
          )
        );

      // If cancelled, update the associated dossier too
      if (newStatus === "cancelled") {
        await tx
          .update(rentalDossiers)
          .set({
            status: "open",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(rentalDossiers.contractId, invoice.contractId),
              eq(rentalDossiers.tenantId, currentUser.tenantId)
            )
          );
      }

      // Audit log
      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "invoice_status_updated",
          entityType: "invoice",
          entityId: invoiceId,
          changes: {
            previousStatus: invoice.status,
            newStatus,
          },
        },
        tx
      );

      return { success: true as const, data: { id: invoiceId } };
    });

    return result;
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "updateInvoiceStatus error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la mise à jour du statut de la facture",
    };
  }
}
