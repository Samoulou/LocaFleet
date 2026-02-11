import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  tenants,
  users,
  vehicleCategories,
  vehicles,
  clients,
  rentalContracts,
  invoices,
  payments,
  userRoleEnum,
  vehicleStatusEnum,
  contractStatusEnum,
  invoiceStatusEnum,
} from "@/db/schema";

// ============================================================================
// Core tables export
// ============================================================================

describe("Core tables export", () => {
  const coreTables = {
    tenants,
    users,
    vehicleCategories,
    vehicles,
    clients,
    rentalContracts,
    invoices,
    payments,
  };

  it.each(Object.entries(coreTables))(
    "%s exports as a pgTable object",
    (_name, table) => {
      const config = getTableConfig(table);
      expect(config).toBeDefined();
      expect(config.name).toEqual(expect.any(String));
      expect(config.columns).toEqual(expect.any(Array));
    }
  );
});

// ============================================================================
// Multi-tenant support
// ============================================================================

describe("Multi-tenant support", () => {
  const businessTables = {
    users,
    vehicleCategories,
    vehicles,
    clients,
    rentalContracts,
    invoices,
    payments,
  };

  it.each(Object.entries(businessTables))(
    "%s has a tenantId column",
    (_name, table) => {
      const columns = getTableColumns(table);
      expect(columns).toHaveProperty("tenantId");
    }
  );

  it.each(Object.entries(businessTables))(
    "%s.tenantId is notNull",
    (_name, table) => {
      const columns = getTableColumns(table);
      expect(columns.tenantId.notNull).toBe(true);
    }
  );

  it("tenants table does NOT have a tenantId column", () => {
    const columns = getTableColumns(tenants);
    expect(columns).not.toHaveProperty("tenantId");
  });
});

// ============================================================================
// Timestamps
// ============================================================================

describe("Timestamps", () => {
  const allCoreTables = {
    tenants,
    users,
    vehicleCategories,
    vehicles,
    clients,
    rentalContracts,
    invoices,
    payments,
  };

  it.each(Object.entries(allCoreTables))(
    "%s has createdAt column",
    (_name, table) => {
      const columns = getTableColumns(table);
      expect(columns).toHaveProperty("createdAt");
      expect(columns.createdAt.notNull).toBe(true);
    }
  );

  // payments only has createdAt (no updatedAt per schema design)
  const tablesWithUpdatedAt = Object.entries(allCoreTables).filter(
    ([name]) => name !== "payments"
  );

  it.each(tablesWithUpdatedAt)("%s has updatedAt column", (_name, table) => {
    const columns = getTableColumns(table) as Record<
      string,
      { notNull: boolean }
    >;
    expect(columns).toHaveProperty("updatedAt");
    expect(columns.updatedAt.notNull).toBe(true);
  });
});

// ============================================================================
// Soft delete
// ============================================================================

describe("Soft delete", () => {
  it("vehicles has deletedAt column", () => {
    const columns = getTableColumns(vehicles);
    expect(columns).toHaveProperty("deletedAt");
    expect(columns.deletedAt.notNull).toBe(false);
  });

  it("clients has deletedAt column", () => {
    const columns = getTableColumns(clients);
    expect(columns).toHaveProperty("deletedAt");
    expect(columns.deletedAt.notNull).toBe(false);
  });

  it("tenants does NOT have deletedAt column", () => {
    const columns = getTableColumns(tenants);
    expect(columns).not.toHaveProperty("deletedAt");
  });
});

// ============================================================================
// Enums
// ============================================================================

describe("Enums", () => {
  it("userRoleEnum has admin, agent, viewer", () => {
    expect(userRoleEnum.enumValues).toEqual(["admin", "agent", "viewer"]);
  });

  it("vehicleStatusEnum has 4 values", () => {
    expect(vehicleStatusEnum.enumValues).toEqual([
      "available",
      "rented",
      "maintenance",
      "out_of_service",
    ]);
  });

  it("contractStatusEnum has 6 values", () => {
    expect(contractStatusEnum.enumValues).toEqual([
      "draft",
      "approved",
      "pending_cg",
      "active",
      "completed",
      "cancelled",
    ]);
  });

  it("invoiceStatusEnum has 6 values", () => {
    expect(invoiceStatusEnum.enumValues).toEqual([
      "pending",
      "invoiced",
      "verification",
      "paid",
      "conflict",
      "cancelled",
    ]);
  });
});

// ============================================================================
// Unique constraints
// ============================================================================

describe("Unique constraints", () => {
  it("vehicles has unique index on plateNumber + tenantId", () => {
    const config = getTableConfig(vehicles);
    const idx = config.indexes.find(
      (i) => i.config.name === "vehicles_plate_tenant_idx"
    );
    expect(idx).toBeDefined();
    expect(idx!.config.unique).toBe(true);
  });

  it("rentalContracts has unique index on contractNumber + tenantId", () => {
    const config = getTableConfig(rentalContracts);
    const idx = config.indexes.find(
      (i) => i.config.name === "contracts_number_tenant_idx"
    );
    expect(idx).toBeDefined();
    expect(idx!.config.unique).toBe(true);
  });

  it("invoices has unique index on invoiceNumber + tenantId", () => {
    const config = getTableConfig(invoices);
    const idx = config.indexes.find(
      (i) => i.config.name === "invoices_number_tenant_idx"
    );
    expect(idx).toBeDefined();
    expect(idx!.config.unique).toBe(true);
  });

  it("users has unique index on email + tenantId", () => {
    const config = getTableConfig(users);
    const idx = config.indexes.find(
      (i) => i.config.name === "users_email_tenant_idx"
    );
    expect(idx).toBeDefined();
    expect(idx!.config.unique).toBe(true);
  });
});

// ============================================================================
// Required fields (notNull)
// ============================================================================

describe("Required fields", () => {
  it("vehicles.brand is notNull", () => {
    const columns = getTableColumns(vehicles);
    expect(columns.brand.notNull).toBe(true);
  });

  it("vehicles.model is notNull", () => {
    const columns = getTableColumns(vehicles);
    expect(columns.model.notNull).toBe(true);
  });

  it("vehicles.plateNumber is notNull", () => {
    const columns = getTableColumns(vehicles);
    expect(columns.plateNumber.notNull).toBe(true);
  });

  it("clients.firstName is notNull", () => {
    const columns = getTableColumns(clients);
    expect(columns.firstName.notNull).toBe(true);
  });

  it("clients.lastName is notNull", () => {
    const columns = getTableColumns(clients);
    expect(columns.lastName.notNull).toBe(true);
  });

  it("clients.phone is notNull", () => {
    const columns = getTableColumns(clients);
    expect(columns.phone.notNull).toBe(true);
  });

  it("rentalContracts.dailyRate is notNull", () => {
    const columns = getTableColumns(rentalContracts);
    expect(columns.dailyRate.notNull).toBe(true);
  });

  it("rentalContracts.totalAmount is notNull", () => {
    const columns = getTableColumns(rentalContracts);
    expect(columns.totalAmount.notNull).toBe(true);
  });

  it("invoices.totalAmount is notNull", () => {
    const columns = getTableColumns(invoices);
    expect(columns.totalAmount.notNull).toBe(true);
  });

  it("payments.amount is notNull", () => {
    const columns = getTableColumns(payments);
    expect(columns.amount.notNull).toBe(true);
  });

  it("users.email is notNull", () => {
    const columns = getTableColumns(users);
    expect(columns.email.notNull).toBe(true);
  });

  it("users.name is notNull", () => {
    const columns = getTableColumns(users);
    expect(columns.name.notNull).toBe(true);
  });

  it("tenants.name is notNull", () => {
    const columns = getTableColumns(tenants);
    expect(columns.name.notNull).toBe(true);
  });
});
