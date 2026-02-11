import { describe, it, expect } from "vitest";
import {
  createDraftInspectionSchema,
  submitDepartureInspectionSchema,
  inspectionDamageSchema,
  saveInspectionPhotoSchema,
  deleteInspectionPhotoSchema,
} from "@/lib/validations/inspection";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "660e8400-e29b-41d4-a716-446655440000";

// ============================================================================
// submitDepartureInspectionSchema
// ============================================================================

describe("submitDepartureInspectionSchema", () => {
  const VALID_FULL = {
    inspectionId: VALID_UUID,
    contractId: VALID_UUID_2,
    mileage: 45000,
    fuelLevel: "three_quarter" as const,
    exteriorCleanliness: "clean" as const,
    interiorCleanliness: "clean" as const,
    agentNotes: "RAS",
    clientSignatureUrl: "data:image/png;base64,abc123",
    damages: [
      {
        zone: "front" as const,
        type: "scratch" as const,
        severity: "low" as const,
        description: "Petite rayure pare-chocs",
        isPreExisting: true,
      },
    ],
  };

  const VALID_MINIMAL = {
    inspectionId: VALID_UUID,
    contractId: VALID_UUID_2,
    mileage: 0,
    fuelLevel: "empty" as const,
    exteriorCleanliness: "dirty" as const,
    interiorCleanliness: "dirty" as const,
  };

  it("accepts valid full input", () => {
    const result = submitDepartureInspectionSchema.safeParse(VALID_FULL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspectionId).toBe(VALID_UUID);
      expect(result.data.contractId).toBe(VALID_UUID_2);
      expect(result.data.mileage).toBe(45000);
      expect(result.data.fuelLevel).toBe("three_quarter");
      expect(result.data.exteriorCleanliness).toBe("clean");
      expect(result.data.interiorCleanliness).toBe("clean");
      expect(result.data.agentNotes).toBe("RAS");
      expect(result.data.damages).toHaveLength(1);
    }
  });

  it("accepts valid minimal input", () => {
    const result = submitDepartureInspectionSchema.safeParse(VALID_MINIMAL);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mileage).toBe(0);
      expect(result.data.fuelLevel).toBe("empty");
      expect(result.data.agentNotes).toBeUndefined();
      expect(result.data.clientSignatureUrl).toBeUndefined();
      expect(result.data.damages).toEqual([]);
    }
  });

  it("rejects invalid contractId", () => {
    const result = submitDepartureInspectionSchema.safeParse({
      ...VALID_MINIMAL,
      contractId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "contractId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects missing mileage", () => {
    const { mileage: _mileage, ...withoutMileage } = VALID_MINIMAL;
    const result = submitDepartureInspectionSchema.safeParse(withoutMileage);
    expect(result.success).toBe(false);
  });

  it("rejects negative mileage", () => {
    const result = submitDepartureInspectionSchema.safeParse({
      ...VALID_MINIMAL,
      mileage: -100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "mileage");
      expect(err?.message).toContain("négatif");
    }
  });

  it("rejects float mileage", () => {
    const result = submitDepartureInspectionSchema.safeParse({
      ...VALID_MINIMAL,
      mileage: 45000.5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "mileage");
      expect(err?.message).toContain("entier");
    }
  });

  it("rejects invalid fuelLevel", () => {
    const result = submitDepartureInspectionSchema.safeParse({
      ...VALID_MINIMAL,
      fuelLevel: "super_full",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "fuelLevel");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid exteriorCleanliness", () => {
    const result = submitDepartureInspectionSchema.safeParse({
      ...VALID_MINIMAL,
      exteriorCleanliness: "average",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "exteriorCleanliness"
      );
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid interiorCleanliness", () => {
    const result = submitDepartureInspectionSchema.safeParse({
      ...VALID_MINIMAL,
      interiorCleanliness: "spotless",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "interiorCleanliness"
      );
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects agentNotes exceeding 5000 characters", () => {
    const result = submitDepartureInspectionSchema.safeParse({
      ...VALID_MINIMAL,
      agentNotes: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "agentNotes");
      expect(err?.message).toContain("5000 caractères");
    }
  });

  it("transforms empty agentNotes to undefined", () => {
    const result = submitDepartureInspectionSchema.safeParse({
      ...VALID_MINIMAL,
      agentNotes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agentNotes).toBeUndefined();
    }
  });

  it("transforms empty clientSignatureUrl to undefined", () => {
    const result = submitDepartureInspectionSchema.safeParse({
      ...VALID_MINIMAL,
      clientSignatureUrl: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clientSignatureUrl).toBeUndefined();
    }
  });
});

// ============================================================================
// inspectionDamageSchema
// ============================================================================

describe("inspectionDamageSchema", () => {
  const VALID_DAMAGE = {
    zone: "front" as const,
    type: "scratch" as const,
    severity: "low" as const,
    description: "Petite rayure",
    isPreExisting: true,
  };

  it("accepts valid damage", () => {
    const result = inspectionDamageSchema.safeParse(VALID_DAMAGE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zone).toBe("front");
      expect(result.data.type).toBe("scratch");
      expect(result.data.severity).toBe("low");
      expect(result.data.isPreExisting).toBe(true);
    }
  });

  it("rejects invalid zone", () => {
    const result = inspectionDamageSchema.safeParse({
      ...VALID_DAMAGE,
      zone: "engine",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "zone");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid type", () => {
    const result = inspectionDamageSchema.safeParse({
      ...VALID_DAMAGE,
      type: "explosion",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "type");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid severity", () => {
    const result = inspectionDamageSchema.safeParse({
      ...VALID_DAMAGE,
      severity: "critical",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "severity");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects description exceeding 1000 characters", () => {
    const result = inspectionDamageSchema.safeParse({
      ...VALID_DAMAGE,
      description: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "description");
      expect(err?.message).toContain("1000 caractères");
    }
  });

  it("rejects invalid photoUrl", () => {
    const result = inspectionDamageSchema.safeParse({
      ...VALID_DAMAGE,
      photoUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "photoUrl");
      expect(err?.message).toContain("invalide");
    }
  });

  it("defaults isPreExisting to true", () => {
    const { isPreExisting: _pre, ...withoutPreExisting } = VALID_DAMAGE;
    const result = inspectionDamageSchema.safeParse(withoutPreExisting);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPreExisting).toBe(true);
    }
  });
});

// ============================================================================
// createDraftInspectionSchema
// ============================================================================

describe("createDraftInspectionSchema", () => {
  it("accepts valid contractId", () => {
    const result = createDraftInspectionSchema.safeParse({
      contractId: VALID_UUID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contractId).toBe(VALID_UUID);
    }
  });

  it("rejects invalid contractId", () => {
    const result = createDraftInspectionSchema.safeParse({
      contractId: "bad-id",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "contractId");
      expect(err?.message).toContain("invalide");
    }
  });
});

// ============================================================================
// saveInspectionPhotoSchema
// ============================================================================

describe("saveInspectionPhotoSchema", () => {
  const VALID_PHOTO = {
    inspectionId: VALID_UUID,
    url: "https://example.com/photo.jpg",
    fileName: "photo.jpg",
    position: "front" as const,
    caption: "Vue avant",
  };

  it("accepts valid photo data", () => {
    const result = saveInspectionPhotoSchema.safeParse(VALID_PHOTO);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspectionId).toBe(VALID_UUID);
      expect(result.data.url).toBe("https://example.com/photo.jpg");
      expect(result.data.position).toBe("front");
    }
  });

  it("rejects invalid URL", () => {
    const result = saveInspectionPhotoSchema.safeParse({
      ...VALID_PHOTO,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "url");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid position", () => {
    const result = saveInspectionPhotoSchema.safeParse({
      ...VALID_PHOTO,
      position: "underneath",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "position");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects fileName exceeding 255 characters", () => {
    const result = saveInspectionPhotoSchema.safeParse({
      ...VALID_PHOTO,
      fileName: "x".repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "fileName");
      expect(err?.message).toContain("255 caractères");
    }
  });

  it("rejects caption exceeding 255 characters", () => {
    const result = saveInspectionPhotoSchema.safeParse({
      ...VALID_PHOTO,
      caption: "x".repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "caption");
      expect(err?.message).toContain("255 caractères");
    }
  });
});

// ============================================================================
// deleteInspectionPhotoSchema
// ============================================================================

describe("deleteInspectionPhotoSchema", () => {
  it("accepts valid IDs", () => {
    const result = deleteInspectionPhotoSchema.safeParse({
      photoId: VALID_UUID,
      inspectionId: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.photoId).toBe(VALID_UUID);
      expect(result.data.inspectionId).toBe(VALID_UUID_2);
    }
  });

  it("rejects invalid photoId", () => {
    const result = deleteInspectionPhotoSchema.safeParse({
      photoId: "bad-id",
      inspectionId: VALID_UUID_2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "photoId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid inspectionId", () => {
    const result = deleteInspectionPhotoSchema.safeParse({
      photoId: VALID_UUID,
      inspectionId: "bad-id",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "inspectionId");
      expect(err?.message).toContain("invalide");
    }
  });
});
