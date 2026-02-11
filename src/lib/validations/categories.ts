import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  description: z
    .string()
    .max(500, "La description ne peut pas dépasser 500 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  dailyRate: z
    .union([
      z.literal(""),
      z.coerce
        .number({
          invalid_type_error: "Le tarif journalier doit être un nombre",
        })
        .min(0, "Le tarif journalier ne peut pas être négatif"),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  weeklyRate: z
    .union([
      z.literal(""),
      z.coerce
        .number({
          invalid_type_error: "Le tarif hebdomadaire doit être un nombre",
        })
        .min(0, "Le tarif hebdomadaire ne peut pas être négatif"),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
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

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().uuid("L'identifiant de la catégorie est invalide"),
});

export type CreateCategoryData = z.infer<typeof createCategorySchema>;
export type UpdateCategoryData = z.infer<typeof updateCategorySchema>;
