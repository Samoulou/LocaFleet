import { eq, and, or, ilike, isNull, gte, lte, lt, sql, count, desc, asc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  vehicles,
  clients,
  rentalContracts,
  invoices,
  maintenanceRecords,
} from "@/db/schema";

// ============================================================================
// Tool executors — each function is tenant-scoped and read-only
// ============================================================================

export async function searchVehicles(
  tenantId: string,
  args: { query: string; status?: string; limit?: number }
) {
  const limit = args.limit ?? 20;
  const pattern = `%${args.query}%`;

  const conditions: SQL<unknown>[] = [
    eq(vehicles.tenantId, tenantId),
    isNull(vehicles.deletedAt),
  ];

  if (args.status) {
    conditions.push(eq(vehicles.status, args.status as typeof vehicles.$inferSelect.status));
  }

  if (args.query.trim()) {
    const searchOr = or(
      ilike(vehicles.brand, pattern),
      ilike(vehicles.model, pattern),
      ilike(vehicles.plateNumber, pattern)
    );
    if (searchOr) conditions.push(searchOr);
  }

  const rows = await db
    .select({
      id: vehicles.id,
      brand: vehicles.brand,
      model: vehicles.model,
      year: vehicles.year,
      color: vehicles.color,
      plateNumber: vehicles.plateNumber,
      mileage: vehicles.mileage,
      fuelType: vehicles.fuelType,
      transmission: vehicles.transmission,
      status: vehicles.status,
      dailyRateOverride: vehicles.dailyRateOverride,
    })
    .from(vehicles)
    .where(and(...conditions))
    .limit(limit)
    .orderBy(asc(vehicles.brand), asc(vehicles.model));

  return rows;
}

export async function getVehicleAvailability(
  tenantId: string,
  args: { startDate: string; endDate: string }
) {
  const start = new Date(args.startDate);
  const end = new Date(args.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Dates invalides");
  }

  // Fetch all non-deleted vehicles that are not permanently out of service
  const allVehicles = await db
    .select({
      id: vehicles.id,
      brand: vehicles.brand,
      model: vehicles.model,
      plateNumber: vehicles.plateNumber,
      status: vehicles.status,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        isNull(vehicles.deletedAt),
        sql`${vehicles.status} != 'out_of_service'`
      )
    );

  // Find contracts that overlap with the requested period
  const overlappingContracts = await db
    .select({
      vehicleId: rentalContracts.vehicleId,
      contractNumber: rentalContracts.contractNumber,
      startDate: rentalContracts.startDate,
      endDate: rentalContracts.endDate,
      status: rentalContracts.status,
    })
    .from(rentalContracts)
    .where(
      and(
        eq(rentalContracts.tenantId, tenantId),
        sql`${rentalContracts.status} IN ('approved', 'pending_cg', 'active')`,
        lt(rentalContracts.startDate, end),
        gte(rentalContracts.endDate, start)
      )
    );

  const busyVehicleIds = new Set(overlappingContracts.map((c) => c.vehicleId));

  const availableVehicles = allVehicles.filter((v) => !busyVehicleIds.has(v.id));

  return {
    availableVehicles,
    overlappingContracts,
    period: { startDate: args.startDate, endDate: args.endDate },
  };
}

export async function searchClients(
  tenantId: string,
  args: { query: string; limit?: number }
) {
  const limit = args.limit ?? 20;
  const pattern = `%${args.query}%`;

  const conditions: SQL<unknown>[] = [
    eq(clients.tenantId, tenantId),
    isNull(clients.deletedAt),
  ];

  if (args.query.trim()) {
    const searchOr = or(
      ilike(clients.firstName, pattern),
      ilike(clients.lastName, pattern),
      ilike(clients.email, pattern),
      ilike(clients.phone, pattern)
    );
    if (searchOr) conditions.push(searchOr);
  }

  const rows = await db
    .select({
      id: clients.id,
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone,
      companyName: clients.companyName,
      isTrusted: clients.isTrusted,
    })
    .from(clients)
    .where(and(...conditions))
    .limit(limit)
    .orderBy(asc(clients.lastName), asc(clients.firstName));

  return rows;
}

export async function getClientContracts(
  tenantId: string,
  args: { clientId: string; status?: string }
) {
  const conditions = [
    eq(rentalContracts.tenantId, tenantId),
    eq(rentalContracts.clientId, args.clientId),
  ];

  if (args.status) {
    conditions.push(
      eq(rentalContracts.status, args.status as typeof rentalContracts.$inferSelect.status)
    );
  }

  const rows = await db
    .select({
      id: rentalContracts.id,
      contractNumber: rentalContracts.contractNumber,
      status: rentalContracts.status,
      startDate: rentalContracts.startDate,
      endDate: rentalContracts.endDate,
      totalAmount: rentalContracts.totalAmount,
      vehicleBrand: vehicles.brand,
      vehicleModel: vehicles.model,
      vehiclePlate: vehicles.plateNumber,
    })
    .from(rentalContracts)
    .innerJoin(vehicles, eq(rentalContracts.vehicleId, vehicles.id))
    .where(and(...conditions))
    .orderBy(desc(rentalContracts.startDate))
    .limit(50);

  return rows;
}

export async function getClientBalance(
  tenantId: string,
  args: { clientId: string }
) {
  const unpaidInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.clientId, args.clientId),
        or(
          eq(invoices.status, "pending"),
          eq(invoices.status, "invoiced"),
          eq(invoices.status, "verification"),
          eq(invoices.status, "conflict")
        )
      )
    )
    .orderBy(desc(invoices.createdAt));

  const totalBalance = unpaidInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.totalAmount),
    0
  );

  return {
    clientId: args.clientId,
    unpaidInvoices,
    totalBalance,
    invoiceCount: unpaidInvoices.length,
  };
}

export async function getContracts(
  tenantId: string,
  args: { status?: string; startDateFrom?: string; startDateTo?: string; limit?: number }
) {
  const limit = args.limit ?? 20;
  const conditions = [eq(rentalContracts.tenantId, tenantId)];

  if (args.status) {
    conditions.push(
      eq(rentalContracts.status, args.status as typeof rentalContracts.$inferSelect.status)
    );
  }
  if (args.startDateFrom) {
    conditions.push(gte(rentalContracts.startDate, new Date(args.startDateFrom)));
  }
  if (args.startDateTo) {
    conditions.push(lte(rentalContracts.startDate, new Date(args.startDateTo)));
  }

  const rows = await db
    .select({
      id: rentalContracts.id,
      contractNumber: rentalContracts.contractNumber,
      status: rentalContracts.status,
      startDate: rentalContracts.startDate,
      endDate: rentalContracts.endDate,
      totalAmount: rentalContracts.totalAmount,
      clientFirstName: clients.firstName,
      clientLastName: clients.lastName,
      vehicleBrand: vehicles.brand,
      vehicleModel: vehicles.model,
      vehiclePlate: vehicles.plateNumber,
    })
    .from(rentalContracts)
    .innerJoin(clients, eq(rentalContracts.clientId, clients.id))
    .innerJoin(vehicles, eq(rentalContracts.vehicleId, vehicles.id))
    .where(and(...conditions))
    .orderBy(desc(rentalContracts.startDate))
    .limit(limit);

  return rows;
}

export async function getMaintenanceRecords(
  tenantId: string,
  args: { vehicleId?: string; status?: string; limit?: number }
) {
  const limit = args.limit ?? 20;
  const conditions = [
    eq(maintenanceRecords.tenantId, tenantId),
  ];

  if (args.vehicleId) {
    conditions.push(eq(maintenanceRecords.vehicleId, args.vehicleId));
  }
  if (args.status) {
    conditions.push(
      eq(maintenanceRecords.status, args.status as typeof maintenanceRecords.$inferSelect.status)
    );
  }

  const rows = await db
    .select({
      id: maintenanceRecords.id,
      vehicleBrand: vehicles.brand,
      vehicleModel: vehicles.model,
      vehiclePlate: vehicles.plateNumber,
      type: maintenanceRecords.type,
      status: maintenanceRecords.status,
      urgency: maintenanceRecords.urgency,
      description: maintenanceRecords.description,
      estimatedCost: maintenanceRecords.estimatedCost,
      finalCost: maintenanceRecords.finalCost,
      mechanicName: maintenanceRecords.mechanicName,
      startDate: maintenanceRecords.startDate,
      endDate: maintenanceRecords.endDate,
    })
    .from(maintenanceRecords)
    .innerJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id))
    .where(and(...conditions))
    .orderBy(desc(maintenanceRecords.startDate))
    .limit(limit);

  return rows;
}

export async function getDashboardSummary(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [activeRentalsResult] = await db
    .select({ count: count() })
    .from(rentalContracts)
    .where(
      and(
        eq(rentalContracts.tenantId, tenantId),
        sql`${rentalContracts.status} IN ('approved', 'pending_cg', 'active')`
      )
    );

  const [returnsDueTodayResult] = await db
    .select({ count: count() })
    .from(rentalContracts)
    .where(
      and(
        eq(rentalContracts.tenantId, tenantId),
        sql`${rentalContracts.status} IN ('approved', 'pending_cg', 'active')`,
        gte(rentalContracts.endDate, today),
        lt(rentalContracts.endDate, tomorrow)
      )
    );

  const [overdueReturnsResult] = await db
    .select({ count: count() })
    .from(rentalContracts)
    .where(
      and(
        eq(rentalContracts.tenantId, tenantId),
        sql`${rentalContracts.status} IN ('approved', 'pending_cg', 'active')`,
        lt(rentalContracts.endDate, today)
      )
    );

  const [maintenanceResult] = await db
    .select({ count: count() })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.status, "maintenance")
      )
    );

  const [availableResult] = await db
    .select({ count: count() })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        isNull(vehicles.deletedAt),
        eq(vehicles.status, "available")
      )
    );

  const [revenueResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), '0')` })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        gte(invoices.createdAt, firstDayOfMonth),
        eq(invoices.status, "paid")
      )
    );

  return {
    activeRentals: activeRentalsResult?.count ?? 0,
    returnsDueToday: returnsDueTodayResult?.count ?? 0,
    overdueReturns: overdueReturnsResult?.count ?? 0,
    vehiclesInMaintenance: maintenanceResult?.count ?? 0,
    availableVehicles: availableResult?.count ?? 0,
    monthlyRevenue: parseFloat(revenueResult?.total ?? "0"),
  };
}

export async function generateEmail(
  _tenantId: string,
  args: {
    recipientName: string;
    purpose: string;
    language?: string;
    details?: string;
  }
) {
  // This is a no-op executor — the email text is generated by the LLM itself
  // We return a placeholder so the LLM knows it "called" the tool
  return {
    recipientName: args.recipientName,
    purpose: args.purpose,
    language: args.language ?? "fr",
    details: args.details ?? "",
    note: "The AI will compose the email text in its final response.",
  };
}
