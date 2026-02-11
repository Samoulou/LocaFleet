import { describe, it, expectTypeOf } from "vitest";
import type {
  SelectTenant,
  SelectUser,
  SelectVehicleCategory,
  SelectVehicle,
  SelectClient,
  SelectRentalContract,
  SelectInvoice,
  SelectPayment,
  InsertTenant,
  InsertUser,
  InsertVehicleCategory,
  InsertVehicle,
  InsertClient,
  InsertRentalContract,
  InsertInvoice,
  InsertPayment,
  UserRole,
} from "@/types";

// ============================================================================
// Type inference — Select types
// ============================================================================

describe("Select types are correctly inferred", () => {
  it("SelectTenant has expected fields", () => {
    expectTypeOf<SelectTenant>().toHaveProperty("id");
    expectTypeOf<SelectTenant>().toHaveProperty("name");
    expectTypeOf<SelectTenant>().toHaveProperty("slug");
    expectTypeOf<SelectTenant>().toHaveProperty("createdAt");
    expectTypeOf<SelectTenant>().toHaveProperty("updatedAt");
  });

  it("SelectUser has expected fields", () => {
    expectTypeOf<SelectUser>().toHaveProperty("id");
    expectTypeOf<SelectUser>().toHaveProperty("tenantId");
    expectTypeOf<SelectUser>().toHaveProperty("email");
    expectTypeOf<SelectUser>().toHaveProperty("name");
    expectTypeOf<SelectUser>().toHaveProperty("role");
    expectTypeOf<SelectUser>().toHaveProperty("isActive");
  });

  it("SelectVehicleCategory has expected fields", () => {
    expectTypeOf<SelectVehicleCategory>().toHaveProperty("id");
    expectTypeOf<SelectVehicleCategory>().toHaveProperty("tenantId");
    expectTypeOf<SelectVehicleCategory>().toHaveProperty("name");
  });

  it("SelectVehicle has expected fields", () => {
    expectTypeOf<SelectVehicle>().toHaveProperty("id");
    expectTypeOf<SelectVehicle>().toHaveProperty("tenantId");
    expectTypeOf<SelectVehicle>().toHaveProperty("brand");
    expectTypeOf<SelectVehicle>().toHaveProperty("plateNumber");
    expectTypeOf<SelectVehicle>().toHaveProperty("deletedAt");
  });

  it("SelectClient has expected fields", () => {
    expectTypeOf<SelectClient>().toHaveProperty("id");
    expectTypeOf<SelectClient>().toHaveProperty("tenantId");
    expectTypeOf<SelectClient>().toHaveProperty("firstName");
    expectTypeOf<SelectClient>().toHaveProperty("lastName");
    expectTypeOf<SelectClient>().toHaveProperty("deletedAt");
  });

  it("SelectRentalContract has expected fields", () => {
    expectTypeOf<SelectRentalContract>().toHaveProperty("id");
    expectTypeOf<SelectRentalContract>().toHaveProperty("tenantId");
    expectTypeOf<SelectRentalContract>().toHaveProperty("contractNumber");
    expectTypeOf<SelectRentalContract>().toHaveProperty("dailyRate");
    expectTypeOf<SelectRentalContract>().toHaveProperty("totalAmount");
  });

  it("SelectInvoice has expected fields", () => {
    expectTypeOf<SelectInvoice>().toHaveProperty("id");
    expectTypeOf<SelectInvoice>().toHaveProperty("tenantId");
    expectTypeOf<SelectInvoice>().toHaveProperty("invoiceNumber");
    expectTypeOf<SelectInvoice>().toHaveProperty("totalAmount");
  });

  it("SelectPayment has expected fields", () => {
    expectTypeOf<SelectPayment>().toHaveProperty("id");
    expectTypeOf<SelectPayment>().toHaveProperty("tenantId");
    expectTypeOf<SelectPayment>().toHaveProperty("amount");
    expectTypeOf<SelectPayment>().toHaveProperty("method");
  });
});

// ============================================================================
// Type inference — Insert types
// ============================================================================

describe("Insert types are correctly inferred", () => {
  it("InsertTenant requires name and slug", () => {
    expectTypeOf<InsertTenant>().toHaveProperty("name");
    expectTypeOf<InsertTenant>().toHaveProperty("slug");
  });

  it("InsertUser requires tenantId, email, and name", () => {
    expectTypeOf<InsertUser>().toHaveProperty("tenantId");
    expectTypeOf<InsertUser>().toHaveProperty("email");
    expectTypeOf<InsertUser>().toHaveProperty("name");
  });

  it("InsertVehicleCategory requires tenantId and name", () => {
    expectTypeOf<InsertVehicleCategory>().toHaveProperty("tenantId");
    expectTypeOf<InsertVehicleCategory>().toHaveProperty("name");
  });

  it("InsertVehicle requires tenantId, brand, model, plateNumber", () => {
    expectTypeOf<InsertVehicle>().toHaveProperty("tenantId");
    expectTypeOf<InsertVehicle>().toHaveProperty("brand");
    expectTypeOf<InsertVehicle>().toHaveProperty("model");
    expectTypeOf<InsertVehicle>().toHaveProperty("plateNumber");
  });

  it("InsertClient requires tenantId, firstName, lastName, phone, email", () => {
    expectTypeOf<InsertClient>().toHaveProperty("tenantId");
    expectTypeOf<InsertClient>().toHaveProperty("firstName");
    expectTypeOf<InsertClient>().toHaveProperty("lastName");
    expectTypeOf<InsertClient>().toHaveProperty("phone");
    expectTypeOf<InsertClient>().toHaveProperty("email");
  });

  it("InsertRentalContract requires tenantId, contractNumber, dailyRate, totalAmount", () => {
    expectTypeOf<InsertRentalContract>().toHaveProperty("tenantId");
    expectTypeOf<InsertRentalContract>().toHaveProperty("contractNumber");
    expectTypeOf<InsertRentalContract>().toHaveProperty("dailyRate");
    expectTypeOf<InsertRentalContract>().toHaveProperty("totalAmount");
  });

  it("InsertInvoice requires tenantId, invoiceNumber, totalAmount", () => {
    expectTypeOf<InsertInvoice>().toHaveProperty("tenantId");
    expectTypeOf<InsertInvoice>().toHaveProperty("invoiceNumber");
    expectTypeOf<InsertInvoice>().toHaveProperty("totalAmount");
  });

  it("InsertPayment requires tenantId, amount, method", () => {
    expectTypeOf<InsertPayment>().toHaveProperty("tenantId");
    expectTypeOf<InsertPayment>().toHaveProperty("amount");
    expectTypeOf<InsertPayment>().toHaveProperty("method");
  });
});

// ============================================================================
// UserRole type
// ============================================================================

describe("UserRole type", () => {
  it("matches the expected union type", () => {
    expectTypeOf<UserRole>().toEqualTypeOf<"admin" | "agent" | "viewer">();
  });
});
