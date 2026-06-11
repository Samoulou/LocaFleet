import { describe, it, expect } from "vitest";
import {
  createFonctionSchema,
  updateFonctionSchema,
  toggleFonctionActiveSchema,
} from "@/lib/validations/fonctions";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================================================
// createFonctionSchema
// ============================================================================

describe("createFonctionSchema", () => {
  const VALID_INPUT = {
    name: "Déménagement",
    color: "#D97706",
    requiresEmployees: true,
    allowsContract: false,
    defaultTimeUnit: "hours",
    sortOrder: "2",
  };

  it("accepts a full valid fonction", () => {
    const result = createFonctionSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiresEmployees).toBe(true);
      expect(result.data.defaultTimeUnit).toBe("hours");
      expect(result.data.sortOrder).toBe(2);
    }
  });

  it("accepts minimal input with defaults", () => {
    const result = createFonctionSchema.safeParse({ name: "Location" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiresEmployees).toBe(false);
      expect(result.data.allowsContract).toBe(false);
      expect(result.data.color).toBeUndefined();
      expect(result.data.defaultTimeUnit).toBeUndefined();
      expect(result.data.sortOrder).toBe(0);
    }
  });

  it("transforms empty optional strings to undefined", () => {
    const result = createFonctionSchema.safeParse({
      name: "Location",
      color: "",
      defaultTimeUnit: "",
      sortOrder: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.color).toBeUndefined();
      expect(result.data.defaultTimeUnit).toBeUndefined();
      expect(result.data.sortOrder).toBe(0);
    }
  });

  it("rejects empty name with French message", () => {
    const result = createFonctionSchema.safeParse({ ...VALID_INPUT, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "name");
      expect(error?.message).toBe("Le nom est requis");
    }
  });

  it("rejects name longer than 100 characters", () => {
    const result = createFonctionSchema.safeParse({
      ...VALID_INPUT,
      name: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex color", () => {
    const result = createFonctionSchema.safeParse({
      ...VALID_INPUT,
      color: "blue",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "color");
      expect(error?.message).toContain("hexadécimal");
    }
  });

  it("rejects invalid defaultTimeUnit", () => {
    const result = createFonctionSchema.safeParse({
      ...VALID_INPUT,
      defaultTimeUnit: "days",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid time units", () => {
    for (const unit of ["hours", "trips", "flat"]) {
      const result = createFonctionSchema.safeParse({
        ...VALID_INPUT,
        defaultTimeUnit: unit,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects negative sortOrder", () => {
    const result = createFonctionSchema.safeParse({
      ...VALID_INPUT,
      sortOrder: "-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean requiresEmployees", () => {
    const result = createFonctionSchema.safeParse({
      ...VALID_INPUT,
      requiresEmployees: "yes",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateFonctionSchema
// ============================================================================

describe("updateFonctionSchema", () => {
  it("accepts valid input with id", () => {
    const result = updateFonctionSchema.safeParse({
      id: VALID_UUID,
      name: "Location",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID with French message", () => {
    const result = updateFonctionSchema.safeParse({
      id: "not-a-uuid",
      name: "Location",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "id");
      expect(error?.message).toBe("L'identifiant de la fonction est invalide");
    }
  });

  it("rejects missing id", () => {
    const result = updateFonctionSchema.safeParse({ name: "Location" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// toggleFonctionActiveSchema
// ============================================================================

describe("toggleFonctionActiveSchema", () => {
  it("accepts valid id and isActive", () => {
    const result = toggleFonctionActiveSchema.safeParse({
      id: VALID_UUID,
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-boolean isActive", () => {
    const result = toggleFonctionActiveSchema.safeParse({
      id: VALID_UUID,
      isActive: "yes",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "isActive");
      expect(error?.message).toBe("La valeur active doit être un booléen");
    }
  });

  it("rejects missing fields", () => {
    const result = toggleFonctionActiveSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
