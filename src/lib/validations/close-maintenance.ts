import { z } from "zod";

export const closeMaintenanceSchema = z.object({
  maintenanceId: z
    .string()
    .uuid("L'identifiant de la maintenance est invalide"),
  endDate: z.coerce.date({
    errorMap: () => ({ message: "La date de fin est invalide" }),
  }),
  finalCost: z
    .union([
      z.literal(""),
      z.coerce
        .number({
          invalid_type_error: "Le coût final doit être un nombre",
        })
        .min(0, "Le coût final ne peut pas être négatif"),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  notes: z
    .string()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type CloseMaintenanceData = z.infer<typeof closeMaintenanceSchema>;
