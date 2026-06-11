import { describe, it, expect } from "vitest";
import {
  trialRequestSchema,
  FLEET_SIZES,
} from "@/lib/validations/trial-request";

const VALID_COMPLETE = {
  companyName: "Garage Lemania SA",
  contactName: "Jean Dupont",
  email: "jean.dupont@lemania.ch",
  phone: "+41 21 000 00 00",
  fleetSize: "31-60",
  message: "Nous gérons une flotte de 45 véhicules à Lausanne.",
  locale: "fr",
  website: "",
};

const VALID_MINIMAL = {
  companyName: "Garage Lemania SA",
  contactName: "Jean Dupont",
  email: "jean.dupont@lemania.ch",
  fleetSize: "1-10",
};

describe("trialRequestSchema", () => {
  it("accepts valid complete data", () => {
    const result = trialRequestSchema.safeParse(VALID_COMPLETE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBe("Garage Lemania SA");
      expect(result.data.contactName).toBe("Jean Dupont");
      expect(result.data.email).toBe("jean.dupont@lemania.ch");
      expect(result.data.phone).toBe("+41 21 000 00 00");
      expect(result.data.fleetSize).toBe("31-60");
      expect(result.data.locale).toBe("fr");
      expect(result.data.website).toBe("");
    }
  });

  it("accepts minimal required fields and defaults locale to fr", () => {
    const result = trialRequestSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
      expect(result.data.message).toBeUndefined();
      expect(result.data.locale).toBe("fr");
    }
  });

  it("transforms empty phone and message to undefined", () => {
    const result = trialRequestSchema.safeParse({
      ...VALID_MINIMAL,
      phone: "",
      message: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
      expect(result.data.message).toBeUndefined();
    }
  });

  it("rejects empty companyName", () => {
    const result = trialRequestSchema.safeParse({
      ...VALID_MINIMAL,
      companyName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty contactName", () => {
    const result = trialRequestSchema.safeParse({
      ...VALID_MINIMAL,
      contactName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = trialRequestSchema.safeParse({
      ...VALID_MINIMAL,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fleetSize", () => {
    const result = trialRequestSchema.safeParse({
      companyName: VALID_MINIMAL.companyName,
      contactName: VALID_MINIMAL.contactName,
      email: VALID_MINIMAL.email,
    });
    expect(result.success).toBe(false);
  });

  it("rejects fleetSize outside allowed values", () => {
    const result = trialRequestSchema.safeParse({
      ...VALID_MINIMAL,
      fleetSize: "5000",
    });
    expect(result.success).toBe(false);
  });

  it("accepts every allowed fleet size", () => {
    for (const size of FLEET_SIZES) {
      const result = trialRequestSchema.safeParse({
        ...VALID_MINIMAL,
        fleetSize: size,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid locale", () => {
    const result = trialRequestSchema.safeParse({
      ...VALID_MINIMAL,
      locale: "de",
    });
    expect(result.success).toBe(false);
  });

  it("rejects message longer than 2000 characters", () => {
    const result = trialRequestSchema.safeParse({
      ...VALID_MINIMAL,
      message: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("keeps honeypot value when filled (handled by the action)", () => {
    const result = trialRequestSchema.safeParse({
      ...VALID_MINIMAL,
      website: "https://spam.example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBe("https://spam.example.com");
    }
  });
});
