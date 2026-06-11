// LocaFleet — Drizzle-inferred TypeScript types
// Single source of truth: src/db/schema.ts

import type {
  tenants,
  users,
  vehicleCategories,
  vehicles,
  clients,
  clientDocuments,
  rentalContracts,
  invoices,
  payments,
  inspections,
  inspectionPhotos,
  inspectionDamages,
  fonctions,
  events,
  eventVehicles,
  eventEmployees,
  eventComments,
  quotes,
} from "@/db/schema";

// ============================================================================
// SELECT types (full row from DB)
// ============================================================================

export type SelectTenant = typeof tenants.$inferSelect;
export type SelectUser = typeof users.$inferSelect;
export type SelectVehicleCategory = typeof vehicleCategories.$inferSelect;
export type SelectVehicle = typeof vehicles.$inferSelect;
export type SelectClient = typeof clients.$inferSelect;
export type SelectRentalContract = typeof rentalContracts.$inferSelect;
export type SelectInvoice = typeof invoices.$inferSelect;
export type SelectPayment = typeof payments.$inferSelect;
export type SelectInspection = typeof inspections.$inferSelect;
export type SelectInspectionPhoto = typeof inspectionPhotos.$inferSelect;
export type SelectInspectionDamage = typeof inspectionDamages.$inferSelect;
export type SelectClientDocument = typeof clientDocuments.$inferSelect;
export type SelectFonction = typeof fonctions.$inferSelect;
export type SelectEvent = typeof events.$inferSelect;
export type SelectEventVehicle = typeof eventVehicles.$inferSelect;
export type SelectEventEmployee = typeof eventEmployees.$inferSelect;
export type SelectEventComment = typeof eventComments.$inferSelect;
export type SelectQuote = typeof quotes.$inferSelect;

// ============================================================================
// INSERT types (required fields for creating a row)
// ============================================================================

export type InsertTenant = typeof tenants.$inferInsert;
export type InsertUser = typeof users.$inferInsert;
export type InsertVehicleCategory = typeof vehicleCategories.$inferInsert;
export type InsertVehicle = typeof vehicles.$inferInsert;
export type InsertClient = typeof clients.$inferInsert;
export type InsertRentalContract = typeof rentalContracts.$inferInsert;
export type InsertInvoice = typeof invoices.$inferInsert;
export type InsertPayment = typeof payments.$inferInsert;
export type InsertInspection = typeof inspections.$inferInsert;
export type InsertInspectionPhoto = typeof inspectionPhotos.$inferInsert;
export type InsertInspectionDamage = typeof inspectionDamages.$inferInsert;
export type InsertFonction = typeof fonctions.$inferInsert;
export type InsertEvent = typeof events.$inferInsert;
export type InsertEventVehicle = typeof eventVehicles.$inferInsert;
export type InsertEventEmployee = typeof eventEmployees.$inferInsert;
export type InsertEventComment = typeof eventComments.$inferInsert;
export type InsertQuote = typeof quotes.$inferInsert;

// ============================================================================
// Enum utility types
// ============================================================================

export type UserRole = SelectUser["role"];
export type VehicleStatus = SelectVehicle["status"];
export type ContractStatus = SelectRentalContract["status"];
export type InvoiceStatus = SelectInvoice["status"];
export type FuelLevel = SelectInspection["fuelLevel"];
export type InspectionType = SelectInspection["type"];
export type EmploymentType = NonNullable<SelectUser["employmentType"]>;
export type InvoicingMode = SelectClient["invoicingMode"];
export type TimeEntryUnit = NonNullable<SelectFonction["defaultTimeUnit"]>;
export type EventStatus = SelectEvent["status"];
export type EventBillingStatus = SelectEvent["billingStatus"];
export type QuoteStatus = SelectQuote["status"];

// ============================================================================
// Quote line item (JSONB snapshot, mirrors InvoiceLineItem without `type`)
// ============================================================================

export type QuoteLineItem = {
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

// ============================================================================
// Server Action result type
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// Client domain types
// ============================================================================

export type ClientListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string | null;
  isTrusted: boolean;
  contractCount: number;
  createdAt: Date;
};

export type ContractSummary = {
  id: string;
  vehicleName: string;
  startDate: Date;
  endDate: Date;
  status: string;
  totalAmount: string | null;
};

export type ClientDetail = SelectClient & {
  documents: SelectClientDocument[];
  recentContracts: ContractSummary[];
};

export type ClientKPIs = {
  totalClients: number;
  trustedClients: number;
  activeRentals: number;
};

// ============================================================================
// Invoice detail types
// ============================================================================

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  type: "base_rental" | "option" | "excess_km" | "damages";
};

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  lineItems: InvoiceLineItem[];
  invoicePdfUrl: string | null;
  issuedAt: Date | null;
  dueDate: string | null;
  notes: string | null;
  createdAt: Date;
  // Related entities
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  vehicle: {
    id: string;
    brand: string;
    model: string;
    plateNumber: string;
  };
  contract: {
    id: string;
    contractNumber: string | null;
    startDate: Date;
    endDate: Date;
  };
  // Payments
  payments: {
    id: string;
    amount: string;
    method: string;
    reference: string | null;
    paidAt: Date;
    notes: string | null;
    createdAt: Date;
  }[];
  totalPaid: number;
  balance: number;
};
