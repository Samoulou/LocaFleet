// ============================================================================
// LocaFleet — Complete Drizzle Schema
// Covers: All 6 Epics (Foundation, Fleet, Clients, Inspections, Billing, Notifications)
// Database: PostgreSQL 16 (Supabase)
// ORM: Drizzle ORM
// ============================================================================

import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("user_role", ["admin", "agent", "viewer"]);

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "available",
  "rented",
  "maintenance",
  "out_of_service",
]);

export const fuelTypeEnum = pgEnum("fuel_type", [
  "gasoline",
  "diesel",
  "electric",
  "hybrid",
]);

export const transmissionEnum = pgEnum("transmission", ["manual", "automatic"]);

export const maintenanceTypeEnum = pgEnum("maintenance_type", [
  "regular_service",
  "repair",
  "technical_inspection",
  "tires",
  "other",
]);

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "open",
  "in_progress",
  "completed",
]);

export const maintenanceUrgencyEnum = pgEnum("maintenance_urgency", [
  "low",
  "medium",
  "high",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "draft",
  "approved",
  "pending_cg",
  "active",
  "completed",
  "cancelled",
]);

export const inspectionTypeEnum = pgEnum("inspection_type", [
  "departure",
  "return",
]);

export const fuelLevelEnum = pgEnum("fuel_level", [
  "empty",
  "quarter",
  "half",
  "three_quarter",
  "full",
]);

export const damageZoneEnum = pgEnum("damage_zone", [
  "front",
  "rear",
  "left_side",
  "right_side",
  "roof",
  "interior",
]);

export const damageTypeEnum = pgEnum("damage_type", [
  "scratch",
  "dent",
  "broken",
  "stain",
  "other",
]);

export const damageSeverityEnum = pgEnum("damage_severity", [
  "low",
  "medium",
  "high",
]);

export const cleanlinessEnum = pgEnum("cleanliness", ["clean", "dirty"]);

export const photoPositionEnum = pgEnum("photo_position", [
  "front",
  "back",
  "left_side",
  "right_side",
  "other",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending",
  "invoiced",
  "verification",
  "paid",
  "conflict",
  "cancelled",
]);

export const dossierStatusEnum = pgEnum("dossier_status", [
  "open",
  "to_invoice",
  "invoiced",
  "paid",
  "archived",
]);

export const depositStatusEnum = pgEnum("deposit_status", [
  "pending",
  "collected",
  "returned",
  "partially_returned",
  "retained",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash_departure",
  "cash_return",
  "invoice",
  "card",
]);

export const clientDocumentTypeEnum = pgEnum("client_document_type", [
  "driving_license",
  "identity_card",
  "proof_of_address",
  "other",
]);

export const emailTypeEnum = pgEnum("email_type", [
  "maintenance_request",
  "booking_confirmation",
  "return_reminder",
  "other",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "sent",
  "failed",
  "pending",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "overdue_return",
  "maintenance_completed",
  "payment_received",
  "contract_created",
  "other",
]);

// ============================================================================
// EPIC 1 — FOUNDATION & AUTH
// ============================================================================

// -- Tenants ------------------------------------------------------------------

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  address: text("address"),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  logoUrl: text("logo_url"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -- Users (Better Auth manages sessions/accounts, this extends user profile) --

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    role: userRoleEnum("role").default("agent").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_tenant_idx").on(table.email, table.tenantId),
    index("users_tenant_idx").on(table.tenantId),
  ]
);

// -- Better Auth sessions (managed by Better Auth, but we define the table) ---

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)]
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("accounts_user_idx").on(table.userId)]
);

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// EPIC 2 — FLEET MANAGEMENT
// ============================================================================

// -- Vehicle Categories -------------------------------------------------------

export const vehicleCategories = pgTable(
  "vehicle_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
    weeklyRate: decimal("weekly_rate", { precision: 10, scale: 2 }),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("vehicle_categories_tenant_idx").on(table.tenantId),
    uniqueIndex("vehicle_categories_name_tenant_idx").on(
      table.name,
      table.tenantId
    ),
  ]
);

// -- Vehicles -----------------------------------------------------------------

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => vehicleCategories.id, {
      onDelete: "set null",
    }),
    brand: varchar("brand", { length: 100 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    year: integer("year"),
    color: varchar("color", { length: 50 }),
    plateNumber: varchar("plate_number", { length: 20 }).notNull(),
    vin: varchar("vin", { length: 17 }),
    mileage: integer("mileage").notNull().default(0),
    fuelType: fuelTypeEnum("fuel_type"),
    transmission: transmissionEnum("transmission"),
    seats: integer("seats"),
    status: vehicleStatusEnum("status").default("available").notNull(),
    coverPhotoUrl: text("cover_photo_url"),
    notes: text("notes"),
    dailyRateOverride: decimal("daily_rate_override", {
      precision: 10,
      scale: 2,
    }),
    weeklyRateOverride: decimal("weekly_rate_override", {
      precision: 10,
      scale: 2,
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("vehicles_tenant_idx").on(table.tenantId),
    index("vehicles_status_idx").on(table.tenantId, table.status),
    index("vehicles_category_idx").on(table.categoryId),
    uniqueIndex("vehicles_plate_tenant_idx").on(
      table.plateNumber,
      table.tenantId
    ),
  ]
);

// -- Vehicle Photos -----------------------------------------------------------

export const vehiclePhotos = pgTable(
  "vehicle_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    fileName: varchar("file_name", { length: 255 }),
    isCover: boolean("is_cover").default(false),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("vehicle_photos_vehicle_idx").on(table.vehicleId)]
);

// -- Maintenance Records ------------------------------------------------------

export const maintenanceRecords = pgTable(
  "maintenance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: maintenanceTypeEnum("type").notNull(),
    status: maintenanceStatusEnum("status").default("open").notNull(),
    urgency: maintenanceUrgencyEnum("urgency").default("medium"),
    description: text("description").notNull(),
    estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
    finalCost: decimal("final_cost", { precision: 10, scale: 2 }),
    mechanicEmail: varchar("mechanic_email", { length: 255 }),
    mechanicName: varchar("mechanic_name", { length: 255 }),
    startDate: timestamp("start_date").defaultNow().notNull(),
    endDate: timestamp("end_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("maintenance_tenant_idx").on(table.tenantId),
    index("maintenance_vehicle_idx").on(table.vehicleId),
    index("maintenance_status_idx").on(table.tenantId, table.status),
  ]
);

// ============================================================================
// EPIC 3 — CLIENTS & CONTRACTS
// ============================================================================

// -- Clients ------------------------------------------------------------------

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    dateOfBirth: date("date_of_birth"),
    address: text("address"),
    phone: varchar("phone", { length: 30 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    licenseNumber: varchar("license_number", { length: 50 }),
    licenseCategory: varchar("license_category", { length: 20 }),
    licenseExpiry: date("license_expiry"),
    identityDocType: varchar("identity_doc_type", { length: 50 }),
    identityDocNumber: varchar("identity_doc_number", { length: 50 }),
    companyName: varchar("company_name", { length: 255 }),
    notes: text("notes"),
    isTrusted: boolean("is_trusted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("clients_tenant_idx").on(table.tenantId),
    index("clients_name_idx").on(
      table.tenantId,
      table.lastName,
      table.firstName
    ),
    index("clients_email_idx").on(table.tenantId, table.email),
  ]
);

// -- Client Documents ---------------------------------------------------------

export const clientDocuments = pgTable(
  "client_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    type: clientDocumentTypeEnum("type").notNull(),
    label: varchar("label", { length: 255 }),
    url: text("url").notNull(),
    fileName: varchar("file_name", { length: 255 }),
    mimeType: varchar("mime_type", { length: 100 }),
    fileSize: integer("file_size"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("client_documents_client_idx").on(table.clientId)]
);

// -- Rental Options (configurable by tenant) ----------------------------------

export const rentalOptions = pgTable(
  "rental_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    dailyPrice: decimal("daily_price", { precision: 10, scale: 2 }).notNull(),
    isPerDay: boolean("is_per_day").default(true),
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("rental_options_tenant_idx").on(table.tenantId)]
);

// -- Rental Contracts ---------------------------------------------------------

export const rentalContracts = pgTable(
  "rental_contracts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contractNumber: varchar("contract_number", { length: 50 }).notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: contractStatusEnum("status").default("draft").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    actualReturnDate: timestamp("actual_return_date"),
    pickupLocation: varchar("pickup_location", { length: 255 }),
    returnLocation: varchar("return_location", { length: 255 }),
    departureMileage: integer("departure_mileage"),
    returnMileage: integer("return_mileage"),
    includedKmPerDay: integer("included_km_per_day"),
    excessKmRate: decimal("excess_km_rate", { precision: 10, scale: 2 }),
    dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }).notNull(),
    totalDays: integer("total_days").notNull(),
    baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).notNull(),
    optionsAmount: decimal("options_amount", {
      precision: 10,
      scale: 2,
    }).default("0"),
    excessKmAmount: decimal("excess_km_amount", {
      precision: 10,
      scale: 2,
    }).default("0"),
    damagesAmount: decimal("damages_amount", {
      precision: 10,
      scale: 2,
    }).default("0"),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
    depositStatus: depositStatusEnum("deposit_status"),
    depositReturnedAmount: decimal("deposit_returned_amount", {
      precision: 10,
      scale: 2,
    }),
    depositReturnedDate: timestamp("deposit_returned_date"),
    termsAccepted: boolean("terms_accepted").default(false),
    notes: text("notes"),
    contractPdfUrl: text("contract_pdf_url"),
    paymentMethod: paymentMethodEnum("payment_method"),
    cgApprovalToken: varchar("cg_approval_token", { length: 255 }),
    cgApprovedAt: timestamp("cg_approved_at"),
    digicode: varchar("digicode", { length: 20 }),
    digicodeExpiresAt: timestamp("digicode_expires_at"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("contracts_tenant_idx").on(table.tenantId),
    index("contracts_client_idx").on(table.clientId),
    index("contracts_vehicle_idx").on(table.vehicleId),
    index("contracts_status_idx").on(table.tenantId, table.status),
    index("contracts_overlap_idx").on(
      table.tenantId,
      table.vehicleId,
      table.status,
      table.startDate,
      table.endDate
    ),
    uniqueIndex("contracts_number_tenant_idx").on(
      table.contractNumber,
      table.tenantId
    ),
    index("contracts_cg_token_idx").on(table.cgApprovalToken),
  ]
);

// -- Contract Options (selected options for a specific contract) ---------------

export const contractOptions = pgTable(
  "contract_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => rentalContracts.id, { onDelete: "cascade" }),
    rentalOptionId: uuid("rental_option_id").references(
      () => rentalOptions.id,
      {
        onDelete: "set null",
      }
    ),
    name: varchar("name", { length: 100 }).notNull(),
    dailyPrice: decimal("daily_price", { precision: 10, scale: 2 }).notNull(),
    quantity: integer("quantity").default(1),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("contract_options_contract_idx").on(table.contractId)]
);

// ============================================================================
// EPIC 4 — INSPECTIONS & PLANNING
// ============================================================================

// -- Inspections (État des lieux) ---------------------------------------------

export const inspections = pgTable(
  "inspections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => rentalContracts.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    conductedByUserId: uuid("conducted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: inspectionTypeEnum("type").notNull(),
    isDraft: boolean("is_draft").default(true).notNull(),
    mileage: integer("mileage").notNull(),
    fuelLevel: fuelLevelEnum("fuel_level").notNull(),
    exteriorCleanliness: cleanlinessEnum("exterior_cleanliness"),
    interiorCleanliness: cleanlinessEnum("interior_cleanliness"),
    clientSignatureUrl: text("client_signature_url"),
    clientAgreed: boolean("client_agreed").default(false),
    agentNotes: text("agent_notes"),
    mechanicRemarks: text("mechanic_remarks"),
    inspectionPdfUrl: text("inspection_pdf_url"),
    conductedAt: timestamp("conducted_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("inspections_tenant_idx").on(table.tenantId),
    index("inspections_contract_idx").on(table.contractId),
    index("inspections_vehicle_idx").on(table.vehicleId),
  ]
);

// -- Inspection Photos --------------------------------------------------------

export const inspectionPhotos = pgTable(
  "inspection_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    fileName: varchar("file_name", { length: 255 }),
    position: photoPositionEnum("position"),
    caption: varchar("caption", { length: 255 }),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("inspection_photos_inspection_idx").on(table.inspectionId)]
);

// -- Inspection Damages -------------------------------------------------------

export const inspectionDamages = pgTable(
  "inspection_damages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    zone: damageZoneEnum("zone").notNull(),
    type: damageTypeEnum("type").notNull(),
    severity: damageSeverityEnum("severity").notNull(),
    description: text("description"),
    photoUrl: text("photo_url"),
    isPreExisting: boolean("is_pre_existing").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("inspection_damages_inspection_idx").on(table.inspectionId)]
);

// ============================================================================
// EPIC 5 — BILLING & DASHBOARD
// ============================================================================

// -- Invoices -----------------------------------------------------------------

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => rentalContracts.id),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    status: invoiceStatusEnum("status").default("pending").notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    lineItems: jsonb("line_items").default([]),
    invoicePdfUrl: text("invoice_pdf_url"),
    issuedAt: timestamp("issued_at"),
    dueDate: date("due_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("invoices_tenant_idx").on(table.tenantId),
    index("invoices_contract_idx").on(table.contractId),
    index("invoices_client_idx").on(table.clientId),
    index("invoices_status_idx").on(table.tenantId, table.status),
    uniqueIndex("invoices_number_tenant_idx").on(
      table.invoiceNumber,
      table.tenantId
    ),
  ]
);

// -- Payments (manual receipts / quittancement) --------------------------------

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    processedByUserId: uuid("processed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    method: paymentMethodEnum("method").notNull(),
    reference: varchar("reference", { length: 255 }),
    paidAt: timestamp("paid_at").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("payments_tenant_idx").on(table.tenantId),
    index("payments_invoice_idx").on(table.invoiceId),
  ]
);

// -- Rental Dossiers (archived completed rentals) -----------------------------

export const rentalDossiers = pgTable(
  "rental_dossiers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => rentalContracts.id)
      .unique(),
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    dossierNumber: varchar("dossier_number", { length: 50 }).notNull(),
    status: dossierStatusEnum("status").default("open").notNull(),
    clientName: varchar("client_name", { length: 255 }).notNull(),
    vehicleInfo: varchar("vehicle_info", { length: 255 }).notNull(),
    rentalPeriod: varchar("rental_period", { length: 100 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    contractPdfUrl: text("contract_pdf_url"),
    departureInspectionPdfUrl: text("departure_inspection_pdf_url"),
    returnInspectionPdfUrl: text("return_inspection_pdf_url"),
    invoicePdfUrl: text("invoice_pdf_url"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("dossiers_tenant_idx").on(table.tenantId),
    index("dossiers_status_idx").on(table.tenantId, table.status),
    uniqueIndex("dossiers_number_tenant_idx").on(
      table.dossierNumber,
      table.tenantId
    ),
  ]
);

// ============================================================================
// EPIC 6 — NOTIFICATIONS & EMAIL
// ============================================================================

// -- Email Logs ---------------------------------------------------------------

export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: emailTypeEnum("type").notNull(),
    status: emailStatusEnum("status").default("pending").notNull(),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    recipientName: varchar("recipient_name", { length: 255 }),
    subject: varchar("subject", { length: 500 }).notNull(),
    body: text("body"),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, {
      onDelete: "set null",
    }),
    contractId: uuid("contract_id").references(() => rentalContracts.id, {
      onDelete: "set null",
    }),
    maintenanceId: uuid("maintenance_id").references(
      () => maintenanceRecords.id,
      { onDelete: "set null" }
    ),
    resendId: varchar("resend_id", { length: 100 }),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("email_logs_tenant_idx").on(table.tenantId),
    index("email_logs_type_idx").on(table.tenantId, table.type),
  ]
);

// -- In-App Notifications -----------------------------------------------------

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    linkUrl: varchar("link_url", { length: 500 }),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_unread_idx").on(table.userId, table.isRead),
  ]
);

// ============================================================================
// AUDIT LOG (cross-epic)
// ============================================================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 50 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id"),
    changes: jsonb("changes"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_tenant_idx").on(table.tenantId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_idx").on(table.tenantId, table.createdAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  vehicles: many(vehicles),
  vehicleCategories: many(vehicleCategories),
  clients: many(clients),
  rentalContracts: many(rentalContracts),
  rentalOptions: many(rentalOptions),
  invoices: many(invoices),
  payments: many(payments),
  rentalDossiers: many(rentalDossiers),
  maintenanceRecords: many(maintenanceRecords),
  emailLogs: many(emailLogs),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  sessions: many(sessions),
  accounts: many(accounts),
  notifications: many(notifications),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const vehicleCategoriesRelations = relations(
  vehicleCategories,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [vehicleCategories.tenantId],
      references: [tenants.id],
    }),
    vehicles: many(vehicles),
  })
);

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [vehicles.tenantId],
    references: [tenants.id],
  }),
  category: one(vehicleCategories, {
    fields: [vehicles.categoryId],
    references: [vehicleCategories.id],
  }),
  photos: many(vehiclePhotos),
  maintenanceRecords: many(maintenanceRecords),
  rentalContracts: many(rentalContracts),
  inspections: many(inspections),
}));

export const vehiclePhotosRelations = relations(vehiclePhotos, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehiclePhotos.vehicleId],
    references: [vehicles.id],
  }),
}));

export const maintenanceRecordsRelations = relations(
  maintenanceRecords,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [maintenanceRecords.tenantId],
      references: [tenants.id],
    }),
    vehicle: one(vehicles, {
      fields: [maintenanceRecords.vehicleId],
      references: [vehicles.id],
    }),
    createdBy: one(users, {
      fields: [maintenanceRecords.createdByUserId],
      references: [users.id],
    }),
    emailLogs: many(emailLogs),
  })
);

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [clients.tenantId],
    references: [tenants.id],
  }),
  documents: many(clientDocuments),
  rentalContracts: many(rentalContracts),
  invoices: many(invoices),
}));

export const clientDocumentsRelations = relations(
  clientDocuments,
  ({ one }) => ({
    client: one(clients, {
      fields: [clientDocuments.clientId],
      references: [clients.id],
    }),
  })
);

export const rentalOptionsRelations = relations(rentalOptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [rentalOptions.tenantId],
    references: [tenants.id],
  }),
}));

export const rentalContractsRelations = relations(
  rentalContracts,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [rentalContracts.tenantId],
      references: [tenants.id],
    }),
    client: one(clients, {
      fields: [rentalContracts.clientId],
      references: [clients.id],
    }),
    vehicle: one(vehicles, {
      fields: [rentalContracts.vehicleId],
      references: [vehicles.id],
    }),
    createdBy: one(users, {
      fields: [rentalContracts.createdByUserId],
      references: [users.id],
    }),
    options: many(contractOptions),
    inspections: many(inspections),
    invoices: many(invoices),
    dossier: one(rentalDossiers),
    emailLogs: many(emailLogs),
  })
);

export const contractOptionsRelations = relations(
  contractOptions,
  ({ one }) => ({
    contract: one(rentalContracts, {
      fields: [contractOptions.contractId],
      references: [rentalContracts.id],
    }),
    rentalOption: one(rentalOptions, {
      fields: [contractOptions.rentalOptionId],
      references: [rentalOptions.id],
    }),
  })
);

export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [inspections.tenantId],
    references: [tenants.id],
  }),
  contract: one(rentalContracts, {
    fields: [inspections.contractId],
    references: [rentalContracts.id],
  }),
  vehicle: one(vehicles, {
    fields: [inspections.vehicleId],
    references: [vehicles.id],
  }),
  conductedBy: one(users, {
    fields: [inspections.conductedByUserId],
    references: [users.id],
  }),
  photos: many(inspectionPhotos),
  damages: many(inspectionDamages),
}));

export const inspectionPhotosRelations = relations(
  inspectionPhotos,
  ({ one }) => ({
    inspection: one(inspections, {
      fields: [inspectionPhotos.inspectionId],
      references: [inspections.id],
    }),
  })
);

export const inspectionDamagesRelations = relations(
  inspectionDamages,
  ({ one }) => ({
    inspection: one(inspections, {
      fields: [inspectionDamages.inspectionId],
      references: [inspections.id],
    }),
  })
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  contract: one(rentalContracts, {
    fields: [invoices.contractId],
    references: [rentalContracts.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  processedBy: one(users, {
    fields: [payments.processedByUserId],
    references: [users.id],
  }),
}));

export const rentalDossiersRelations = relations(rentalDossiers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [rentalDossiers.tenantId],
    references: [tenants.id],
  }),
  contract: one(rentalContracts, {
    fields: [rentalDossiers.contractId],
    references: [rentalContracts.id],
  }),
  invoice: one(invoices, {
    fields: [rentalDossiers.invoiceId],
    references: [invoices.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [emailLogs.tenantId],
    references: [tenants.id],
  }),
  vehicle: one(vehicles, {
    fields: [emailLogs.vehicleId],
    references: [vehicles.id],
  }),
  contract: one(rentalContracts, {
    fields: [emailLogs.contractId],
    references: [rentalContracts.id],
  }),
  maintenance: one(maintenanceRecords, {
    fields: [emailLogs.maintenanceId],
    references: [maintenanceRecords.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notifications.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
