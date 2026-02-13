import { describe, it, expect } from "vitest";
import {
  quickCreateClientSchema,
  clientFormSchema,
  clientListParamsSchema,
} from "@/lib/validations/clients";

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
      expect(err?.message).toContain("100 caract");
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
      expect(err?.message).toContain("100 caract");
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
      expect(err?.message).toContain("30 caract");
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
      expect(err?.message).toContain("255 caract");
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
      expect(err?.message).toContain("50 caract");
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

// ============================================================================
// clientFormSchema tests
// ============================================================================

const VALID_FORM_FULL = {
  firstName: "Marie",
  lastName: "Martin",
  email: "marie.martin@example.ch",
  phone: "+41 79 987 65 43",
  dateOfBirth: "1990-01-15",
  address: "Rue de Lausanne 10, 1003 Lausanne",
  licenseNumber: "G 12345678",
  licenseCategory: "B",
  licenseExpiry: "2028-06-30",
  identityDocType: "passport",
  identityDocNumber: "X1234567",
  companyName: "Martin SA",
  notes: "Client fidele",
  isTrusted: true,
};

const VALID_FORM_MINIMAL = {
  firstName: "Jean",
  lastName: "Dupont",
  email: "jean@example.ch",
  phone: "+41 79 000 00 00",
};

describe("clientFormSchema", () => {
  // --------------------------------------------------------------------------
  // Success cases
  // --------------------------------------------------------------------------

  it("accepts valid full input with all fields", () => {
    const result = clientFormSchema.safeParse(VALID_FORM_FULL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Marie");
      expect(result.data.lastName).toBe("Martin");
      expect(result.data.email).toBe("marie.martin@example.ch");
      expect(result.data.phone).toBe("+41 79 987 65 43");
      expect(result.data.dateOfBirth).toBe("1990-01-15");
      expect(result.data.address).toBe("Rue de Lausanne 10, 1003 Lausanne");
      expect(result.data.licenseNumber).toBe("G 12345678");
      expect(result.data.licenseCategory).toBe("B");
      expect(result.data.licenseExpiry).toBe("2028-06-30");
      expect(result.data.identityDocType).toBe("passport");
      expect(result.data.identityDocNumber).toBe("X1234567");
      expect(result.data.companyName).toBe("Martin SA");
      expect(result.data.notes).toBe("Client fidele");
      expect(result.data.isTrusted).toBe(true);
    }
  });

  it("accepts minimal input with only required fields", () => {
    const result = clientFormSchema.safeParse(VALID_FORM_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Jean");
      expect(result.data.lastName).toBe("Dupont");
      expect(result.data.email).toBe("jean@example.ch");
      expect(result.data.phone).toBe("+41 79 000 00 00");
      expect(result.data.dateOfBirth).toBeUndefined();
      expect(result.data.address).toBeUndefined();
      expect(result.data.licenseNumber).toBeUndefined();
      expect(result.data.companyName).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
      expect(result.data.isTrusted).toBe(false);
    }
  });

  // --------------------------------------------------------------------------
  // Required field validation
  // --------------------------------------------------------------------------

  it("rejects empty firstName", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      firstName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "firstName");
      expect(err).toBeDefined();
      expect(err?.message).toContain("requis");
    }
  });

  it("rejects empty lastName", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      lastName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty phone", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      phone: "",
    });
    expect(result.success).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Invalid email
  // --------------------------------------------------------------------------

  it("rejects invalid email format", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
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
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      firstName: "x".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "firstName");
      expect(err?.message).toContain("100 caract");
    }
  });

  it("rejects lastName > 100 chars", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      lastName: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects phone > 30 chars", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      phone: "1".repeat(31),
    });
    expect(result.success).toBe(false);
  });

  it("rejects email > 255 chars", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      email: "a".repeat(251) + "@x.ch",
    });
    expect(result.success).toBe(false);
  });

  it("rejects address > 1000 chars", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      address: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects licenseNumber > 50 chars", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      licenseNumber: "x".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects licenseCategory > 20 chars", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      licenseCategory: "x".repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it("rejects identityDocNumber > 50 chars", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      identityDocNumber: "x".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects companyName > 255 chars", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      companyName: "x".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejects notes > 2000 chars", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      notes: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Transforms: empty string -> undefined
  // --------------------------------------------------------------------------

  it("transforms empty optional strings to undefined", () => {
    const result = clientFormSchema.safeParse({
      ...VALID_FORM_MINIMAL,
      dateOfBirth: "",
      address: "",
      licenseNumber: "",
      licenseCategory: "",
      licenseExpiry: "",
      identityDocType: "",
      identityDocNumber: "",
      companyName: "",
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeUndefined();
      expect(result.data.address).toBeUndefined();
      expect(result.data.licenseNumber).toBeUndefined();
      expect(result.data.licenseCategory).toBeUndefined();
      expect(result.data.licenseExpiry).toBeUndefined();
      expect(result.data.identityDocType).toBeUndefined();
      expect(result.data.identityDocNumber).toBeUndefined();
      expect(result.data.companyName).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  // --------------------------------------------------------------------------
  // Defaults
  // --------------------------------------------------------------------------

  it("defaults isTrusted to false", () => {
    const result = clientFormSchema.safeParse(VALID_FORM_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isTrusted).toBe(false);
    }
  });
});

// ============================================================================
// clientListParamsSchema tests
// ============================================================================

describe("clientListParamsSchema", () => {
  // --------------------------------------------------------------------------
  // Defaults
  // --------------------------------------------------------------------------

  it("applies default values when input is empty", () => {
    const result = clientListParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.sortBy).toBe("createdAt");
      expect(result.data.sortOrder).toBe("desc");
      expect(result.data.search).toBeUndefined();
    }
  });

  // --------------------------------------------------------------------------
  // Valid values
  // --------------------------------------------------------------------------

  it("accepts valid page and pageSize", () => {
    const result = clientListParamsSchema.safeParse({
      page: 3,
      pageSize: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it("accepts valid sortBy values", () => {
    const validSortFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "createdAt",
      "isTrusted",
    ];
    for (const field of validSortFields) {
      const result = clientListParamsSchema.safeParse({ sortBy: field });
      expect(result.success).toBe(true);
    }
  });

  it("accepts valid sortOrder values", () => {
    for (const order of ["asc", "desc"]) {
      const result = clientListParamsSchema.safeParse({ sortOrder: order });
      expect(result.success).toBe(true);
    }
  });

  it("accepts a search string", () => {
    const result = clientListParamsSchema.safeParse({ search: "Dupont" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("Dupont");
    }
  });

  it("coerces string numbers to integers", () => {
    const result = clientListParamsSchema.safeParse({
      page: "2",
      pageSize: "30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(30);
    }
  });

  // --------------------------------------------------------------------------
  // Rejection cases
  // --------------------------------------------------------------------------

  it("rejects page < 1", () => {
    const result = clientListParamsSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative page", () => {
    const result = clientListParamsSchema.safeParse({ page: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects pageSize > 100", () => {
    const result = clientListParamsSchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects pageSize < 1", () => {
    const result = clientListParamsSchema.safeParse({ pageSize: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sortBy value", () => {
    const result = clientListParamsSchema.safeParse({ sortBy: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sortOrder value", () => {
    const result = clientListParamsSchema.safeParse({ sortOrder: "random" });
    expect(result.success).toBe(false);
  });

  it("rejects search > 255 chars", () => {
    const result = clientListParamsSchema.safeParse({
      search: "x".repeat(256),
    });
    expect(result.success).toBe(false);
  });
});
