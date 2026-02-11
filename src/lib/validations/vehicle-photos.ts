import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

export const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** 10 MB in bytes */
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

// ============================================================================
// Schemas
// ============================================================================

/** Save a photo record after successful upload to Supabase Storage */
export const saveVehiclePhotoSchema = z.object({
  vehicleId: z.string().uuid("L'identifiant du véhicule est invalide"),
  url: z.string().url("L'URL de la photo est invalide"),
  fileName: z
    .string()
    .max(255, "Le nom du fichier ne peut pas dépasser 255 caractères")
    .optional(),
});

/** Delete a photo */
export const deleteVehiclePhotoSchema = z.object({
  photoId: z.string().uuid("L'identifiant de la photo est invalide"),
  vehicleId: z.string().uuid("L'identifiant du véhicule est invalide"),
});

/** Set a photo as the cover */
export const setCoverPhotoSchema = z.object({
  photoId: z.string().uuid("L'identifiant de la photo est invalide"),
  vehicleId: z.string().uuid("L'identifiant du véhicule est invalide"),
});

// ============================================================================
// Types
// ============================================================================

export type SaveVehiclePhotoData = z.infer<typeof saveVehiclePhotoSchema>;
export type DeleteVehiclePhotoData = z.infer<typeof deleteVehiclePhotoSchema>;
export type SetCoverPhotoData = z.infer<typeof setCoverPhotoSchema>;
