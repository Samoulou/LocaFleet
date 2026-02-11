import { describe, it, expect } from "vitest";
import {
  vehicleFormSchema,
  vehicleUpdateSchema,
} from "@/lib/validations/vehicle-form";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_COMPLETE = {
  brand: "BMW",
  model: "X3",
  plateNumber: "VD 123456",
  mileage: 45230,
  year: 2023,
  color: "Noir",
  vin: "WBA12345678901234",
  categoryId: VALID_UUID,
  fuelType: "diesel",
  transmission: "automatic",
  seats: 5,
  notes: "Véhicule en bon état",
};

const VALID_MINIMAL = {
  brand: "Toyota",
  model: "Corolla",
  plateNumber: "GE 789",
  mileage: 0,
  categoryId: VALID_UUID,
};

describe("vehicleFormSchema", () => {
  it("accepts valid complete data", () => {
    const result = vehicleFormSchema.safeParse(VALID_COMPLETE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand).toBe("BMW");
      expect(result.data.model).toBe("X3");
      expect(result.data.plateNumber).toBe("VD 123456");
      expect(result.data.mileage).toBe(45230);
      expect(result.data.year).toBe(2023);
      expect(result.data.color).toBe("Noir");
      expect(result.data.vin).toBe("WBA12345678901234");
      expect(result.data.categoryId).toBe(VALID_UUID);
      expect(result.data.fuelType).toBe("diesel");
      expect(result.data.transmission).toBe("automatic");
      expect(result.data.seats).toBe(5);
      expect(result.data.notes).toBe("Véhicule en bon état");
    }
  });

  it("accepts minimal required fields only", () => {
    const result = vehicleFormSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand).toBe("Toyota");
      expect(result.data.year).toBeUndefined();
      expect(result.data.color).toBeUndefined();
      expect(result.data.vin).toBeUndefined();
      expect(result.data.fuelType).toBeUndefined();
      expect(result.data.transmission).toBeUndefined();
      expect(result.data.seats).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("rejects empty brand", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      brand: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "brand");
      expect(err?.message).toContain("requise");
    }
  });

  it("rejects empty model", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      model: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "model");
      expect(err?.message).toContain("requis");
    }
  });

  it("rejects empty plateNumber", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      plateNumber: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "plateNumber");
      expect(err?.message).toContain("requis");
    }
  });

  it("rejects brand > 100 chars", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      brand: "a".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "brand");
      expect(err?.message).toContain("100 caractères");
    }
  });

  it("rejects negative mileage", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      mileage: -1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "mileage");
      expect(err?.message).toContain("négatif");
    }
  });

  it("rejects year < 1900", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      year: 1800,
    });
    expect(result.success).toBe(false);
  });

  it("rejects year too far in the future", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      year: new Date().getFullYear() + 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects vin > 17 chars", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      vin: "A".repeat(18),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "vin");
      expect(err?.message).toContain("17 caractères");
    }
  });

  it("rejects invalid fuelType", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      fuelType: "nuclear",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid transmission", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      transmission: "cvt",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID categoryId", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      categoryId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "categoryId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects seats < 1", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      seats: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "seats");
      expect(err?.message).toContain("au moins 1");
    }
  });

  it("rejects seats > 50", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      seats: 51,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "seats");
      expect(err?.message).toContain("50");
    }
  });

  it("rejects notes > 2000 chars", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      notes: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "notes");
      expect(err?.message).toContain("2000 caractères");
    }
  });

  it("coerces string mileage to number", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      mileage: "12345",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mileage).toBe(12345);
    }
  });

  it("accepts empty optional fields as undefined", () => {
    const result = vehicleFormSchema.safeParse({
      ...VALID_MINIMAL,
      year: "",
      color: "",
      vin: "",
      fuelType: "",
      transmission: "",
      seats: "",
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBeUndefined();
      expect(result.data.color).toBeUndefined();
      expect(result.data.vin).toBeUndefined();
      expect(result.data.fuelType).toBeUndefined();
      expect(result.data.transmission).toBeUndefined();
      expect(result.data.seats).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("accepts all 4 valid fuelType values", () => {
    const fuelTypes = ["gasoline", "diesel", "electric", "hybrid"] as const;
    for (const fuelType of fuelTypes) {
      const result = vehicleFormSchema.safeParse({
        ...VALID_MINIMAL,
        fuelType,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts both transmission values", () => {
    for (const transmission of ["manual", "automatic"]) {
      const result = vehicleFormSchema.safeParse({
        ...VALID_MINIMAL,
        transmission,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("vehicleUpdateSchema", () => {
  it("accepts valid data with id", () => {
    const result = vehicleUpdateSchema.safeParse({
      ...VALID_COMPLETE,
      id: VALID_UUID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(VALID_UUID);
    }
  });

  it("rejects missing id", () => {
    const result = vehicleUpdateSchema.safeParse(VALID_COMPLETE);
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID id", () => {
    const result = vehicleUpdateSchema.safeParse({
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
