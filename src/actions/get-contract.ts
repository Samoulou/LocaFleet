"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  rentalContracts,
  contractOptions,
  clients,
  vehicles,
  vehicleCategories,
  invoices,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import type { ActionResult, ContractStatus, InvoiceStatus } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type ContractOptionDetail = {
  id: string;
  name: string;
  dailyPrice: string;
  quantity: number | null;
  totalPrice: string;
};

export type ContractDetail = {
  id: string;
  contractNumber: string;
  status: ContractStatus;
  startDate: Date;
  endDate: Date;
  dailyRate: string;
  totalDays: number;
  baseAmount: string;
  optionsAmount: string | null;
  totalAmount: string;
  depositAmount: string | null;
  depositStatus: string | null;
  paymentMethod: string | null;
  pickupLocation: string | null;
  returnLocation: string | null;
  notes: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  actualReturnDate: Date | null;
  // Client info
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    isTrusted: boolean;
  };
  // Vehicle info
  vehicle: {
    id: string;
    brand: string;
    model: string;
    plateNumber: string;
    categoryName: string | null;
    dailyRateOverride: string | null;
  };
  // Options
  options: ContractOptionDetail[];
  // Invoice (if exists)
  invoice: {
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    totalAmount: string;
    issuedAt: Date | null;
  } | null;
};

// ============================================================================
// getContractById
// ============================================================================

export async function getContractById(
  contractId: string
): Promise<ActionResult<ContractDetail>> {
  try {
    const currentUser = await requirePermission("contracts", "read");

    // 1. Fetch contract with client, vehicle, and category
    const [row] = await db
      .select({
        // Contract fields
        id: rentalContracts.id,
        contractNumber: rentalContracts.contractNumber,
        status: rentalContracts.status,
        startDate: rentalContracts.startDate,
        endDate: rentalContracts.endDate,
        dailyRate: rentalContracts.dailyRate,
        totalDays: rentalContracts.totalDays,
        baseAmount: rentalContracts.baseAmount,
        optionsAmount: rentalContracts.optionsAmount,
        totalAmount: rentalContracts.totalAmount,
        depositAmount: rentalContracts.depositAmount,
        depositStatus: rentalContracts.depositStatus,
        paymentMethod: rentalContracts.paymentMethod,
        pickupLocation: rentalContracts.pickupLocation,
        returnLocation: rentalContracts.returnLocation,
        notes: rentalContracts.notes,
        createdAt: rentalContracts.createdAt,
        archivedAt: rentalContracts.archivedAt,
        actualReturnDate: rentalContracts.actualReturnDate,
        // Client fields
        clientId: clients.id,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        clientIsTrusted: clients.isTrusted,
        // Vehicle fields
        vehicleId: vehicles.id,
        vehicleBrand: vehicles.brand,
        vehicleModel: vehicles.model,
        vehiclePlateNumber: vehicles.plateNumber,
        vehicleDailyRateOverride: vehicles.dailyRateOverride,
        // Category
        categoryName: vehicleCategories.name,
      })
      .from(rentalContracts)
      .innerJoin(clients, eq(rentalContracts.clientId, clients.id))
      .innerJoin(vehicles, eq(rentalContracts.vehicleId, vehicles.id))
      .leftJoin(
        vehicleCategories,
        eq(vehicles.categoryId, vehicleCategories.id)
      )
      .where(
        and(
          eq(rentalContracts.id, contractId),
          eq(rentalContracts.tenantId, currentUser.tenantId)
        )
      );

    if (!row) {
      return { success: false, error: "Ce contrat n'existe pas" };
    }

    // 2. Fetch contract options
    const options = await db
      .select({
        id: contractOptions.id,
        name: contractOptions.name,
        dailyPrice: contractOptions.dailyPrice,
        quantity: contractOptions.quantity,
        totalPrice: contractOptions.totalPrice,
      })
      .from(contractOptions)
      .where(eq(contractOptions.contractId, contractId));

    // 3. Fetch associated invoice (if exists)
    const [invoiceRow] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        totalAmount: invoices.totalAmount,
        issuedAt: invoices.issuedAt,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.contractId, contractId),
          eq(invoices.tenantId, currentUser.tenantId)
        )
      );

    return {
      success: true,
      data: {
        id: row.id,
        contractNumber: row.contractNumber,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        dailyRate: row.dailyRate,
        totalDays: row.totalDays,
        baseAmount: row.baseAmount,
        optionsAmount: row.optionsAmount,
        totalAmount: row.totalAmount,
        depositAmount: row.depositAmount,
        depositStatus: row.depositStatus,
        paymentMethod: row.paymentMethod,
        pickupLocation: row.pickupLocation,
        returnLocation: row.returnLocation,
        notes: row.notes,
        createdAt: row.createdAt,
        archivedAt: row.archivedAt,
        actualReturnDate: row.actualReturnDate,
        client: {
          id: row.clientId,
          firstName: row.clientFirstName,
          lastName: row.clientLastName,
          phone: row.clientPhone,
          email: row.clientEmail,
          isTrusted: row.clientIsTrusted,
        },
        vehicle: {
          id: row.vehicleId,
          brand: row.vehicleBrand,
          model: row.vehicleModel,
          plateNumber: row.vehiclePlateNumber,
          categoryName: row.categoryName,
          dailyRateOverride: row.vehicleDailyRateOverride,
        },
        options,
        invoice: invoiceRow
          ? {
              id: invoiceRow.id,
              invoiceNumber: invoiceRow.invoiceNumber,
              status: invoiceRow.status,
              totalAmount: invoiceRow.totalAmount,
              issuedAt: invoiceRow.issuedAt,
            }
          : null,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getContractById error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement du contrat",
    };
  }
}
