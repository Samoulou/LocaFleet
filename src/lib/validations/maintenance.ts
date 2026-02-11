import { z } from "zod";

export const createMaintenanceSchema = z.object({
  vehicleId: z.string().uuid("L'identifiant du véhicule est invalide"),
  type: z.enum(
    ["regular_service", "repair", "technical_inspection", "tires", "other"],
    {
      errorMap: () => ({ message: "Le type de maintenance est invalide" }),
    }
  ),
  description: z
    .string()
    .min(1, "La description est requise")
    .max(2000, "La description ne peut pas dépasser 2000 caractères"),
  startDate: z.coerce.date({
    errorMap: () => ({ message: "La date de début est invalide" }),
  }),
  estimatedCost: z
    .union([
      z.literal(""),
      z.coerce
        .number({
          invalid_type_error: "Le coût estimé doit être un nombre",
        })
        .min(0, "Le coût estimé ne peut pas être négatif"),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  mechanicName: z
    .string()
    .max(255, "Le nom du mécanicien ne peut pas dépasser 255 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  mechanicEmail: z
    .union([
      z.literal(""),
      z.string().email("L'email du mécanicien est invalide"),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  urgency: z
    .enum(["low", "medium", "high"], {
      errorMap: () => ({ message: "Le niveau d'urgence est invalide" }),
    })
    .default("medium"),
  notes: z
    .string()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type CreateMaintenanceData = z.infer<typeof createMaintenanceSchema>;
