import { z } from "zod";

const currentYear = new Date().getFullYear();

export const vehicleFormSchema = z.object({
  brand: z
    .string()
    .min(1, "La marque est requise")
    .max(100, "La marque ne peut pas dépasser 100 caractères"),
  model: z
    .string()
    .min(1, "Le modèle est requis")
    .max(100, "Le modèle ne peut pas dépasser 100 caractères"),
  plateNumber: z
    .string()
    .min(1, "Le numéro d'immatriculation est requis")
    .max(20, "Le numéro d'immatriculation ne peut pas dépasser 20 caractères"),
  mileage: z.coerce
    .number({
      invalid_type_error: "Le kilométrage doit être un nombre",
    })
    .int("Le kilométrage doit être un nombre entier")
    .min(0, "Le kilométrage ne peut pas être négatif"),
  year: z
    .union([
      z.literal(""),
      z.coerce
        .number({
          invalid_type_error: "L'année doit être un nombre",
        })
        .int("L'année doit être un nombre entier")
        .min(1900, "L'année doit être au moins 1900")
        .max(
          currentYear + 1,
          `L'année ne peut pas dépasser ${currentYear + 1}`
        ),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  color: z
    .string()
    .max(50, "La couleur ne peut pas dépasser 50 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  vin: z
    .string()
    .max(17, "Le VIN ne peut pas dépasser 17 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  categoryId: z.string().uuid("L'identifiant de catégorie est invalide"),
  fuelType: z
    .union([
      z.literal(""),
      z.enum(["gasoline", "diesel", "electric", "hybrid"], {
        errorMap: () => ({ message: "Le type de carburant est invalide" }),
      }),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  transmission: z
    .union([
      z.literal(""),
      z.enum(["manual", "automatic"], {
        errorMap: () => ({ message: "La transmission est invalide" }),
      }),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  seats: z
    .union([
      z.literal(""),
      z.coerce
        .number({
          invalid_type_error: "Le nombre de places doit être un nombre",
        })
        .int("Le nombre de places doit être un nombre entier")
        .min(1, "Le nombre de places doit être au moins 1")
        .max(50, "Le nombre de places ne peut pas dépasser 50"),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  notes: z
    .string()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const vehicleUpdateSchema = vehicleFormSchema.extend({
  id: z.string().uuid("L'identifiant du véhicule est invalide"),
});

export type VehicleFormData = z.infer<typeof vehicleFormSchema>;
export type VehicleUpdateData = z.infer<typeof vehicleUpdateSchema>;

export type VehicleFormFieldErrors = Partial<
  Record<keyof VehicleFormData | "id", string>
>;
