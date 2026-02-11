import { describe, it, expect } from "vitest";
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/lib/validations/categories";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_COMPLETE = {
  name: "SUV",
  description: "Sport Utility Vehicles",
  dailyRate: "120.00",
  weeklyRate: "650.00",
  sortOrder: "2",
};

const VALID_MINIMAL = {
  name: "Citadine",
};

describe("createCategorySchema", () => {
  it("accepts valid complete data", () => {
    const result = createCategorySchema.safeParse(VALID_COMPLETE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("SUV");
      expect(result.data.description).toBe("Sport Utility Vehicles");
      expect(result.data.dailyRate).toBe(120);
      expect(result.data.weeklyRate).toBe(650);
      expect(result.data.sortOrder).toBe(2);
    }
  });

  it("accepts minimal required fields only", () => {
    const result = createCategorySchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Citadine");
      expect(result.data.description).toBeUndefined();
      expect(result.data.dailyRate).toBeUndefined();
      expect(result.data.weeklyRate).toBeUndefined();
      expect(result.data.sortOrder).toBe(0);
    }
  });

  it("rejects missing name", () => {
    const result = createCategorySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createCategorySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "name");
      expect(err?.message).toContain("requis");
    }
  });

  it("rejects name > 100 chars", () => {
    const result = createCategorySchema.safeParse({
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "name");
      expect(err?.message).toContain("100 caractères");
    }
  });

  it("rejects description > 500 chars", () => {
    const result = createCategorySchema.safeParse({
      ...VALID_MINIMAL,
      description: "x".repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "description");
      expect(err?.message).toContain("500 caractères");
    }
  });

  it("rejects negative daily rate", () => {
    const result = createCategorySchema.safeParse({
      ...VALID_MINIMAL,
      dailyRate: "-10",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "dailyRate");
      expect(err?.message).toContain("négatif");
    }
  });

  it("rejects negative weekly rate", () => {
    const result = createCategorySchema.safeParse({
      ...VALID_MINIMAL,
      weeklyRate: "-50",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "weeklyRate");
      expect(err?.message).toContain("négatif");
    }
  });

  it("rejects negative sort order", () => {
    const result = createCategorySchema.safeParse({
      ...VALID_MINIMAL,
      sortOrder: "-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "sortOrder");
      expect(err?.message).toContain("négatif");
    }
  });

  it("accepts empty optional fields as undefined", () => {
    const result = createCategorySchema.safeParse({
      ...VALID_MINIMAL,
      description: "",
      dailyRate: "",
      weeklyRate: "",
      sortOrder: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
      expect(result.data.dailyRate).toBeUndefined();
      expect(result.data.weeklyRate).toBeUndefined();
      expect(result.data.sortOrder).toBe(0);
    }
  });

  it("coerces string rates to numbers", () => {
    const result = createCategorySchema.safeParse({
      ...VALID_MINIMAL,
      dailyRate: "85.50",
      weeklyRate: "450",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dailyRate).toBe(85.5);
      expect(result.data.weeklyRate).toBe(450);
    }
  });

  it("defaults sortOrder to 0 when omitted", () => {
    const result = createCategorySchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(0);
    }
  });
});

describe("updateCategorySchema", () => {
  it("accepts valid data with id", () => {
    const result = updateCategorySchema.safeParse({
      ...VALID_COMPLETE,
      id: VALID_UUID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(VALID_UUID);
      expect(result.data.name).toBe("SUV");
    }
  });

  it("rejects missing id", () => {
    const result = updateCategorySchema.safeParse(VALID_COMPLETE);
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID id", () => {
    const result = updateCategorySchema.safeParse({
      ...VALID_COMPLETE,
      id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "id");
      expect(err?.message).toContain("invalide");
    }
  });
});
