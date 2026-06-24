import { z } from "zod";

const hexColorSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .regex(
        /^#[0-9a-fA-F]{6}$/,
        "La couleur doit être au format hexadécimal (ex. #2563EB)"
      ),
  ])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const defaultTimeUnitSchema = z
  .union([
    z.literal(""),
    z.enum(["hours", "trips", "flat"], {
      errorMap: () => ({
        message: "L'unité de temps sélectionnée est invalide",
      }),
    }),
  ])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const createFonctionSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  color: hexColorSchema,
  requiresEmployees: z
    .boolean({
      invalid_type_error: "La valeur doit être un booléen",
    })
    .optional()
    .default(false),
  allowsContract: z
    .boolean({
      invalid_type_error: "La valeur doit être un booléen",
    })
    .optional()
    .default(false),
  defaultTimeUnit: defaultTimeUnitSchema,
  sortOrder: z
    .union([
      z.literal(""),
      z.coerce
        .number({
          invalid_type_error: "L'ordre de tri doit être un nombre",
        })
        .int("L'ordre de tri doit être un nombre entier")
        .min(0, "L'ordre de tri ne peut pas être négatif"),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? 0 : v)),
});

export const updateFonctionSchema = createFonctionSchema.extend({
  id: z.string().uuid("L'identifiant de la fonction est invalide"),
});

export const toggleFonctionActiveSchema = z.object({
  id: z.string().uuid("L'identifiant de la fonction est invalide"),
  isActive: z.boolean({
    invalid_type_error: "La valeur active doit être un booléen",
  }),
});

export type CreateFonctionData = z.infer<typeof createFonctionSchema>;
export type UpdateFonctionData = z.infer<typeof updateFonctionSchema>;
export type ToggleFonctionActiveData = z.infer<
  typeof toggleFonctionActiveSchema
>;
