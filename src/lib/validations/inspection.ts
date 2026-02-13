import { z } from "zod";

// ============================================================================
// Enums (matching DB schema)
// ============================================================================

const fuelLevelValues = [
  "empty",
  "quarter",
  "half",
  "three_quarter",
  "full",
] as const;

const cleanlinessValues = ["clean", "dirty"] as const;

const damageZoneValues = [
  "front",
  "rear",
  "left_side",
  "right_side",
  "roof",
  "interior",
] as const;

const damageTypeValues = [
  "scratch",
  "dent",
  "broken",
  "stain",
  "other",
] as const;

const damageSeverityValues = ["low", "medium", "high"] as const;

const photoPositionValues = [
  "front",
  "back",
  "left_side",
  "right_side",
  "other",
] as const;

// ============================================================================
// inspectionDamageSchema
// ============================================================================

export const inspectionDamageSchema = z.object({
  zone: z.enum(damageZoneValues, {
    errorMap: () => ({ message: "La zone de dommage est invalide" }),
  }),
  type: z.enum(damageTypeValues, {
    errorMap: () => ({ message: "Le type de dommage est invalide" }),
  }),
  severity: z.enum(damageSeverityValues, {
    errorMap: () => ({ message: "La gravité du dommage est invalide" }),
  }),
  description: z
    .string()
    .max(1000, "La description ne peut pas dépasser 1000 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  photoUrl: z
    .string()
    .url("L'URL de la photo est invalide")
    .optional()
    .or(z.literal("")),
  isPreExisting: z.boolean().default(true),
});

export type InspectionDamageData = z.infer<typeof inspectionDamageSchema>;

// ============================================================================
// createDraftInspectionSchema
// ============================================================================

export const createDraftInspectionSchema = z.object({
  contractId: z.string().uuid("L'identifiant du contrat est invalide"),
});

export type CreateDraftInspectionData = z.infer<
  typeof createDraftInspectionSchema
>;

// ============================================================================
// submitDepartureInspectionSchema
// ============================================================================

export const submitDepartureInspectionSchema = z.object({
  inspectionId: z.string().uuid("L'identifiant de l'inspection est invalide"),
  contractId: z.string().uuid("L'identifiant du contrat est invalide"),
  mileage: z.coerce
    .number({
      invalid_type_error: "Le kilométrage doit être un nombre",
    })
    .int("Le kilométrage doit être un entier")
    .min(0, "Le kilométrage ne peut pas être négatif"),
  fuelLevel: z.enum(fuelLevelValues, {
    errorMap: () => ({ message: "Le niveau de carburant est invalide" }),
  }),
  exteriorCleanliness: z.enum(cleanlinessValues, {
    errorMap: () => ({
      message: "La propreté extérieure est invalide",
    }),
  }),
  interiorCleanliness: z.enum(cleanlinessValues, {
    errorMap: () => ({
      message: "La propreté intérieure est invalide",
    }),
  }),
  agentNotes: z
    .string()
    .max(5000, "Les notes ne peuvent pas dépasser 5000 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  clientSignatureUrl: z
    .string()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  damages: z.array(inspectionDamageSchema).default([]),
});

export type SubmitDepartureInspectionData = z.infer<
  typeof submitDepartureInspectionSchema
>;

// ============================================================================
// updateDepartureInspectionSchema (same shape as submit)
// ============================================================================

export const updateDepartureInspectionSchema = submitDepartureInspectionSchema;

export type UpdateDepartureInspectionData = z.infer<
  typeof updateDepartureInspectionSchema
>;

// ============================================================================
// submitReturnInspectionSchema
// ============================================================================

export const submitReturnInspectionSchema = z
  .object({
    inspectionId: z.string().uuid("L'identifiant de l'inspection est invalide"),
    contractId: z.string().uuid("L'identifiant du contrat est invalide"),
    mileage: z.coerce
      .number({
        invalid_type_error: "Le kilométrage doit être un nombre",
      })
      .int("Le kilométrage doit être un entier")
      .min(0, "Le kilométrage ne peut pas être négatif"),
    departureMileage: z.coerce
      .number({
        invalid_type_error: "Le kilométrage de départ doit être un nombre",
      })
      .int("Le kilométrage de départ doit être un entier")
      .min(0, "Le kilométrage de départ ne peut pas être négatif"),
    fuelLevel: z.enum(fuelLevelValues, {
      errorMap: () => ({ message: "Le niveau de carburant est invalide" }),
    }),
    exteriorCleanliness: z.enum(cleanlinessValues, {
      errorMap: () => ({
        message: "La propreté extérieure est invalide",
      }),
    }),
    interiorCleanliness: z.enum(cleanlinessValues, {
      errorMap: () => ({
        message: "La propreté intérieure est invalide",
      }),
    }),
    agentNotes: z
      .string()
      .max(5000, "Les notes ne peuvent pas dépasser 5000 caractères")
      .optional()
      .transform((v) => (v === "" ? undefined : v?.trim())),
    mechanicRemarks: z
      .string()
      .max(
        5000,
        "Les remarques mécanicien ne peuvent pas dépasser 5000 caractères"
      )
      .optional()
      .transform((v) => (v === "" ? undefined : v?.trim())),
    clientSignatureUrl: z
      .string()
      .min(1, "La signature du client est obligatoire au retour"),
    damages: z.array(inspectionDamageSchema).default([]),
  })
  .refine((data) => data.mileage >= data.departureMileage, {
    message:
      "Le kilométrage de retour ne peut pas être inférieur au kilométrage de départ",
    path: ["mileage"],
  });

export type SubmitReturnInspectionData = z.infer<
  typeof submitReturnInspectionSchema
>;

// ============================================================================
// updateReturnInspectionSchema
// ============================================================================

export const updateReturnInspectionSchema = submitReturnInspectionSchema;

export type UpdateReturnInspectionData = z.infer<
  typeof updateReturnInspectionSchema
>;

// ============================================================================
// saveInspectionPhotoSchema
// ============================================================================

export const saveInspectionPhotoSchema = z.object({
  inspectionId: z.string().uuid("L'identifiant de l'inspection est invalide"),
  url: z.string().url("L'URL de la photo est invalide"),
  fileName: z
    .string()
    .max(255, "Le nom du fichier ne peut pas dépasser 255 caractères")
    .optional(),
  position: z
    .enum(photoPositionValues, {
      errorMap: () => ({ message: "La position de la photo est invalide" }),
    })
    .optional(),
  caption: z
    .string()
    .max(255, "La légende ne peut pas dépasser 255 caractères")
    .optional(),
});

export type SaveInspectionPhotoData = z.infer<typeof saveInspectionPhotoSchema>;

// ============================================================================
// deleteInspectionPhotoSchema
// ============================================================================

export const deleteInspectionPhotoSchema = z.object({
  photoId: z.string().uuid("L'identifiant de la photo est invalide"),
  inspectionId: z.string().uuid("L'identifiant de l'inspection est invalide"),
});

export type DeleteInspectionPhotoData = z.infer<
  typeof deleteInspectionPhotoSchema
>;
