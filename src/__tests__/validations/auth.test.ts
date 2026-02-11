import { describe, it, expect } from "vitest";
import { loginSchema } from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "admin@locafleet.ch",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts password with exactly 6 characters", () => {
    const result = loginSchema.safeParse({
      email: "admin@locafleet.ch",
      password: "abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "secret123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === "email");
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("L'email est requis");
    }
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === "email");
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Format d'email invalide");
    }
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "admin@locafleet.ch",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordError = result.error.issues.find(
        (i) => i.path[0] === "password"
      );
      expect(passwordError).toBeDefined();
      expect(passwordError?.message).toBe("Le mot de passe est requis");
    }
  });

  it("rejects password shorter than 6 characters", () => {
    const result = loginSchema.safeParse({
      email: "admin@locafleet.ch",
      password: "abc12",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordError = result.error.issues.find(
        (i) => i.path[0] === "password"
      );
      expect(passwordError).toBeDefined();
      expect(passwordError?.message).toBe(
        "Le mot de passe doit contenir au moins 6 caractères"
      );
    }
  });

  it("rejects both fields missing with multiple errors", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailErrors = result.error.issues.filter(
        (i) => i.path[0] === "email"
      );
      const passwordErrors = result.error.issues.filter(
        (i) => i.path[0] === "password"
      );
      expect(emailErrors.length).toBeGreaterThan(0);
      expect(passwordErrors.length).toBeGreaterThan(0);
    }
  });

  it("has error messages in French", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      for (const issue of result.error.issues) {
        // All messages should be in French (contain French chars or known French words)
        expect(issue.message).toMatch(
          /requis|invalide|caractères|mot de passe|email/i
        );
      }
    }
  });
});
