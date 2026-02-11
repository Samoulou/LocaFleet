import { describe, it, expect } from "vitest";
import { vehicleListParamsSchema } from "@/lib/validations/vehicles";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("vehicleListParamsSchema", () => {
  it("accepts valid complete params", () => {
    const result = vehicleListParamsSchema.safeParse({
      page: 2,
      pageSize: 10,
      status: "available",
      category: VALID_UUID,
      search: "BMW",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(10);
      expect(result.data.status).toBe("available");
      expect(result.data.category).toBe(VALID_UUID);
      expect(result.data.search).toBe("BMW");
    }
  });

  it("accepts empty object with defaults", () => {
    const result = vehicleListParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.status).toBeUndefined();
      expect(result.data.category).toBeUndefined();
      expect(result.data.search).toBeUndefined();
    }
  });

  it('coerces string "2" to number 2 for page', () => {
    const result = vehicleListParamsSchema.safeParse({ page: "2" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
    }
  });

  it("rejects page < 1", () => {
    const result = vehicleListParamsSchema.safeParse({ page: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "page");
      expect(error?.message).toContain("au moins 1");
    }
  });

  it("rejects page = 0", () => {
    const result = vehicleListParamsSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "page");
      expect(error?.message).toContain("au moins 1");
    }
  });

  it("rejects invalid status", () => {
    const result = vehicleListParamsSchema.safeParse({ status: "flying" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "status");
      expect(error?.message).toBe("Le statut sélectionné est invalide");
    }
  });

  it("rejects non-UUID category", () => {
    const result = vehicleListParamsSchema.safeParse({ category: "not-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "category");
      expect(error?.message).toBe("L'identifiant de catégorie est invalide");
    }
  });

  it("rejects search > 100 chars", () => {
    const result = vehicleListParamsSchema.safeParse({
      search: "a".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "search");
      expect(error?.message).toContain("100 caractères");
    }
  });

  it("defaults page=1 and pageSize=20", () => {
    const result = vehicleListParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("accepts all 4 valid status values", () => {
    const statuses = [
      "available",
      "rented",
      "maintenance",
      "out_of_service",
    ] as const;
    for (const status of statuses) {
      const result = vehicleListParamsSchema.safeParse({ status });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(status);
      }
    }
  });
});
