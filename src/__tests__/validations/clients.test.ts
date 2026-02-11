import { describe, it, expect } from "vitest";
import { quickCreateClientSchema } from "@/lib/validations/clients";

const VALID_FULL = {
  firstName: "Jean",
  lastName: "Dupont",
  phone: "+41 79 123 45 67",
  email: "jean.dupont@example.ch",
  licenseNumber: "G 12345678",
  isTrusted: true,
};

const VALID_MINIMAL = {
  firstName: "Marie",
  lastName: "Martin",
  phone: "+41 79 987 65 43",
  email: "marie.martin@example.ch",
};

describe("quickCreateClientSchema", () => {
  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("accepts valid full input", () => {
    const result = quickCreateClientSchema.safeParse(VALID_FULL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Jean");
      expect(result.data.lastName).toBe("Dupont");
      expect(result.data.phone).toBe("+41 79 123 45 67");
      expect(result.data.email).toBe("jean.dupont@example.ch");
      expect(result.data.licenseNumber).toBe("G 12345678");
      expect(result.data.isTrusted).toBe(true);
    }
  });

  it("accepts minimal input (required only)", () => {
    const result = quickCreateClientSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Marie");
      expect(result.data.lastName).toBe("Martin");
      expect(result.data.phone).toBe("+41 79 987 65 43");
      expect(result.data.email).toBe("marie.martin@example.ch");
      expect(result.data.licenseNumber).toBeUndefined();
      expect(result.data.isTrusted).toBe(false);
    }
  });

  // --------------------------------------------------------------------------
  // Missing required fields
  // --------------------------------------------------------------------------

  it("rejects missing firstName", () => {
    const { firstName, ...rest } = VALID_MINIMAL;
    const result = quickCreateClientSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "firstName");
      expect(err).toBeDefined();
    }
  });

  it("rejects missing lastName", () => {
    const { lastName, ...rest } = VALID_MINIMAL;
    const result = quickCreateClientSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "lastName");
      expect(err).toBeDefined();
    }
  });

  it("rejects missing phone", () => {
    const { phone, ...rest } = VALID_MINIMAL;
    const result = quickCreateClientSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "phone");
      expect(err).toBeDefined();
    }
  });

  it("rejects missing email", () => {
    const { email, ...rest } = VALID_MINIMAL;
    const result = quickCreateClientSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "email");
      expect(err).toBeDefined();
    }
  });

  // --------------------------------------------------------------------------
  // Invalid email format
  // --------------------------------------------------------------------------

  it("rejects invalid email format", () => {
    const result = quickCreateClientSchema.safeParse({
      ...VALID_MINIMAL,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "email");
      expect(err?.message).toContain("invalide");
    }
  });

  // --------------------------------------------------------------------------
  // Max length validations
  // --------------------------------------------------------------------------

  it("rejects firstName > 100 chars", () => {
    const result = quickCreateClientSchema.safeParse({
      ...VALID_MINIMAL,
      firstName: "x".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "firstName");
      expect(err?.message).toContain("100 caractères");
    }
  });

  it("rejects lastName > 100 chars", () => {
    const result = quickCreateClientSchema.safeParse({
      ...VALID_MINIMAL,
      lastName: "x".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "lastName");
      expect(err?.message).toContain("100 caractères");
    }
  });

  it("rejects phone > 30 chars", () => {
    const result = quickCreateClientSchema.safeParse({
      ...VALID_MINIMAL,
      phone: "1".repeat(31),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "phone");
      expect(err?.message).toContain("30 caractères");
    }
  });

  it("rejects email > 255 chars", () => {
    const result = quickCreateClientSchema.safeParse({
      ...VALID_MINIMAL,
      email: "a".repeat(251) + "@x.ch",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "email");
      expect(err?.message).toContain("255 caractères");
    }
  });

  it("rejects licenseNumber > 50 chars", () => {
    const result = quickCreateClientSchema.safeParse({
      ...VALID_FULL,
      licenseNumber: "x".repeat(51),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "licenseNumber"
      );
      expect(err?.message).toContain("50 caractères");
    }
  });

  // --------------------------------------------------------------------------
  // Transforms
  // --------------------------------------------------------------------------

  it("transforms empty licenseNumber to undefined", () => {
    const result = quickCreateClientSchema.safeParse({
      ...VALID_MINIMAL,
      licenseNumber: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.licenseNumber).toBeUndefined();
    }
  });

  // --------------------------------------------------------------------------
  // Defaults
  // --------------------------------------------------------------------------

  it("defaults isTrusted to false", () => {
    const result = quickCreateClientSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isTrusted).toBe(false);
    }
  });
});
