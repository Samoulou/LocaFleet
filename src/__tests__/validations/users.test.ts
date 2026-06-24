import { describe, it, expect } from "vitest";
import {
  updateUserRoleSchema,
  toggleUserActiveSchema,
  createUserSchema,
  updateUserProfileSchema,
} from "@/lib/validations/users";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================================================
// updateUserRoleSchema
// ============================================================================

describe("updateUserRoleSchema", () => {
  it("accepts valid userId and role", () => {
    const result = updateUserRoleSchema.safeParse({
      userId: VALID_UUID,
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid roles", () => {
    for (const role of ["admin", "agent", "viewer", "employee"]) {
      const result = updateUserRoleSchema.safeParse({
        userId: VALID_UUID,
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid UUID", () => {
    const result = updateUserRoleSchema.safeParse({
      userId: "not-a-uuid",
      role: "admin",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "userId");
      expect(error?.message).toBe("L'identifiant utilisateur est invalide");
    }
  });

  it("rejects invalid role", () => {
    const result = updateUserRoleSchema.safeParse({
      userId: VALID_UUID,
      role: "superadmin",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "role");
      expect(error?.message).toBe("Le rôle sélectionné est invalide");
    }
  });

  it("rejects missing fields", () => {
    const result = updateUserRoleSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("has French error messages", () => {
    const result = updateUserRoleSchema.safeParse({
      userId: "bad",
      role: "invalid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      for (const issue of result.error.issues) {
        expect(issue.message).toMatch(/invalide|sélectionné|identifiant/i);
      }
    }
  });
});

// ============================================================================
// toggleUserActiveSchema
// ============================================================================

describe("toggleUserActiveSchema", () => {
  it("accepts valid userId and isActive true", () => {
    const result = toggleUserActiveSchema.safeParse({
      userId: VALID_UUID,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts isActive false", () => {
    const result = toggleUserActiveSchema.safeParse({
      userId: VALID_UUID,
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const result = toggleUserActiveSchema.safeParse({
      userId: "not-a-uuid",
      isActive: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "userId");
      expect(error?.message).toBe("L'identifiant utilisateur est invalide");
    }
  });

  it("rejects non-boolean isActive", () => {
    const result = toggleUserActiveSchema.safeParse({
      userId: VALID_UUID,
      isActive: "yes",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "isActive");
      expect(error?.message).toBe("La valeur active doit être un booléen");
    }
  });

  it("rejects missing fields", () => {
    const result = toggleUserActiveSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ============================================================================
// createUserSchema
// ============================================================================

describe("createUserSchema", () => {
  const VALID_INPUT = {
    name: "Marco Déménageur",
    email: "marco@locafleet.ch",
    password: "secret123",
    role: "employee",
    phone: "+41 79 123 45 67",
    hourlyRate: "28.50",
    employmentType: "hourly",
  };

  it("accepts a full valid employee", () => {
    const result = createUserSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hourlyRate).toBe(28.5);
      expect(result.data.employmentType).toBe("hourly");
    }
  });

  it("accepts minimal input (empty optional fields)", () => {
    const result = createUserSchema.safeParse({
      name: "Agent Bureau",
      email: "bureau@locafleet.ch",
      password: "secret123",
      role: "agent",
      phone: "",
      hourlyRate: "",
      employmentType: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
      expect(result.data.hourlyRate).toBeUndefined();
      expect(result.data.employmentType).toBeUndefined();
    }
  });

  it("rejects password shorter than 6 characters", () => {
    const result = createUserSchema.safeParse({
      ...VALID_INPUT,
      password: "abc",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "password");
      expect(error?.message).toContain("6 caractères");
    }
  });

  it("rejects invalid email", () => {
    const result = createUserSchema.safeParse({
      ...VALID_INPUT,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "email");
      expect(error?.message).toBe("L'adresse e-mail est invalide");
    }
  });

  it("rejects invalid role", () => {
    const result = createUserSchema.safeParse({
      ...VALID_INPUT,
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative hourly rate", () => {
    const result = createUserSchema.safeParse({
      ...VALID_INPUT,
      hourlyRate: "-5",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "hourlyRate");
      expect(error?.message).toBe("Le taux horaire ne peut pas être négatif");
    }
  });

  it("rejects invalid employment type", () => {
    const result = createUserSchema.safeParse({
      ...VALID_INPUT,
      employmentType: "freelance",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createUserSchema.safeParse({ ...VALID_INPUT, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path[0] === "name");
      expect(error?.message).toBe("Le nom est requis");
    }
  });
});

// ============================================================================
// updateUserProfileSchema
// ============================================================================

describe("updateUserProfileSchema", () => {
  const VALID_INPUT = {
    userId: VALID_UUID,
    name: "Marco Déménageur",
    phone: "+41 79 123 45 67",
    hourlyRate: "30.00",
    employmentType: "salaried",
  };

  it("accepts a valid profile update", () => {
    const result = updateUserProfileSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hourlyRate).toBe(30);
    }
  });

  it("accepts cleared optional fields", () => {
    const result = updateUserProfileSchema.safeParse({
      userId: VALID_UUID,
      name: "Marco",
      phone: "",
      hourlyRate: "",
      employmentType: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
      expect(result.data.hourlyRate).toBeUndefined();
      expect(result.data.employmentType).toBeUndefined();
    }
  });

  it("rejects invalid UUID", () => {
    const result = updateUserProfileSchema.safeParse({
      ...VALID_INPUT,
      userId: "bad",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = updateUserProfileSchema.safeParse({
      ...VALID_INPUT,
      name: "",
    });
    expect(result.success).toBe(false);
  });
});
