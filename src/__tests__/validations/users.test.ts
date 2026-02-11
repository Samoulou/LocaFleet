import { describe, it, expect } from "vitest";
import {
  updateUserRoleSchema,
  toggleUserActiveSchema,
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
    for (const role of ["admin", "agent", "viewer"]) {
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
