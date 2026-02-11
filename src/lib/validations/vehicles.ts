import { z } from "zod";

export const vehicleListParamsSchema = z.object({
  page: z.coerce
    .number({
      invalid_type_error: "Le numéro de page est invalide",
    })
    .int("Le numéro de page doit être un entier")
    .min(1, "Le numéro de page doit être au moins 1")
    .default(1),
  pageSize: z.coerce
    .number({
      invalid_type_error: "La taille de page est invalide",
    })
    .int("La taille de page doit être un entier")
    .min(1, "La taille de page doit être au moins 1")
    .max(100, "La taille de page ne peut pas dépasser 100")
    .default(20),
  status: z
    .enum(["available", "rented", "maintenance", "out_of_service"], {
      errorMap: () => ({ message: "Le statut sélectionné est invalide" }),
    })
    .optional(),
  category: z
    .string()
    .uuid("L'identifiant de catégorie est invalide")
    .optional(),
  search: z
    .string()
    .max(100, "La recherche ne peut pas dépasser 100 caractères")
    .optional(),
});

export type VehicleListParams = z.infer<typeof vehicleListParamsSchema>;
