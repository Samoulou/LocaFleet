// LocaFleet — Drizzle-inferred TypeScript types
// Single source of truth: src/db/schema.ts

import type {
  tenants,
  users,
  vehicleCategories,
  vehicles,
  clients,
  rentalContracts,
  invoices,
  payments,
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

// ============================================================================
// Enum utility types
// ============================================================================

export type UserRole = SelectUser["role"];
export type VehicleStatus = SelectVehicle["status"];
export type ContractStatus = SelectRentalContract["status"];
export type InvoiceStatus = SelectInvoice["status"];

// ============================================================================
// Server Action result type
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
