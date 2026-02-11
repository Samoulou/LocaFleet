import { describe, it, expect } from "vitest";
import {
  saveVehiclePhotoSchema,
  deleteVehiclePhotoSchema,
  setCoverPhotoSchema,
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_SIZE,
} from "@/lib/validations/vehicle-photos";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "660e8400-e29b-41d4-a716-446655440001";

// ============================================================================
// saveVehiclePhotoSchema
// ============================================================================

describe("saveVehiclePhotoSchema", () => {
  const VALID_INPUT = {
    vehicleId: VALID_UUID,
    url: "https://example.supabase.co/storage/v1/object/public/vehicle-photos/test.jpg",
    fileName: "photo.jpg",
  };

  it("accepts valid complete data", () => {
    const result = saveVehiclePhotoSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleId).toBe(VALID_UUID);
      expect(result.data.url).toContain("https://");
      expect(result.data.fileName).toBe("photo.jpg");
    }
  });

  it("accepts valid data without fileName", () => {
    const { fileName: _omitted, ...input } = VALID_INPUT;
    const result = saveVehiclePhotoSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileName).toBeUndefined();
    }
  });

  it("rejects missing vehicleId", () => {
    const { vehicleId: _omitted, ...input } = VALID_INPUT;
    const result = saveVehiclePhotoSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid vehicleId (not UUID)", () => {
    const result = saveVehiclePhotoSchema.safeParse({
      ...VALID_INPUT,
      vehicleId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "vehicleId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid URL", () => {
    const result = saveVehiclePhotoSchema.safeParse({
      ...VALID_INPUT,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "url");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects missing URL", () => {
    const { url: _omitted, ...input } = VALID_INPUT;
    const result = saveVehiclePhotoSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects fileName > 255 chars", () => {
    const result = saveVehiclePhotoSchema.safeParse({
      ...VALID_INPUT,
      fileName: "a".repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "fileName");
      expect(err?.message).toContain("255 caractères");
    }
  });
});

// ============================================================================
// deleteVehiclePhotoSchema
// ============================================================================

describe("deleteVehiclePhotoSchema", () => {
  const VALID_INPUT = {
    photoId: VALID_UUID,
    vehicleId: VALID_UUID_2,
  };

  it("accepts valid data", () => {
    const result = deleteVehiclePhotoSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.photoId).toBe(VALID_UUID);
      expect(result.data.vehicleId).toBe(VALID_UUID_2);
    }
  });

  it("rejects missing photoId", () => {
    const { photoId: _omitted, ...input } = VALID_INPUT;
    const result = deleteVehiclePhotoSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing vehicleId", () => {
    const { vehicleId: _omitted, ...input } = VALID_INPUT;
    const result = deleteVehiclePhotoSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid photoId (not UUID)", () => {
    const result = deleteVehiclePhotoSchema.safeParse({
      ...VALID_INPUT,
      photoId: "bad-id",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "photoId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid vehicleId (not UUID)", () => {
    const result = deleteVehiclePhotoSchema.safeParse({
      ...VALID_INPUT,
      vehicleId: "bad-id",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "vehicleId");
      expect(err?.message).toContain("invalide");
    }
  });
});

// ============================================================================
// setCoverPhotoSchema
// ============================================================================

describe("setCoverPhotoSchema", () => {
  const VALID_INPUT = {
    photoId: VALID_UUID,
    vehicleId: VALID_UUID_2,
  };

  it("accepts valid data", () => {
    const result = setCoverPhotoSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.photoId).toBe(VALID_UUID);
      expect(result.data.vehicleId).toBe(VALID_UUID_2);
    }
  });

  it("rejects missing photoId", () => {
    const { photoId: _omitted, ...input } = VALID_INPUT;
    const result = setCoverPhotoSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing vehicleId", () => {
    const { vehicleId: _omitted, ...input } = VALID_INPUT;
    const result = setCoverPhotoSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid photoId (not UUID)", () => {
    const result = setCoverPhotoSchema.safeParse({
      ...VALID_INPUT,
      photoId: "not-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "photoId");
      expect(err?.message).toContain("invalide");
    }
  });

  it("rejects invalid vehicleId (not UUID)", () => {
    const result = setCoverPhotoSchema.safeParse({
      ...VALID_INPUT,
      vehicleId: "not-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "vehicleId");
      expect(err?.message).toContain("invalide");
    }
  });
});

// ============================================================================
// Constants
// ============================================================================

describe("photo constants", () => {
  it("ALLOWED_PHOTO_TYPES includes jpeg, png, webp", () => {
    expect(ALLOWED_PHOTO_TYPES).toContain("image/jpeg");
    expect(ALLOWED_PHOTO_TYPES).toContain("image/png");
    expect(ALLOWED_PHOTO_TYPES).toContain("image/webp");
    expect(ALLOWED_PHOTO_TYPES).toHaveLength(3);
  });

  it("MAX_PHOTO_SIZE is 10MB", () => {
    expect(MAX_PHOTO_SIZE).toBe(10 * 1024 * 1024);
  });
});
