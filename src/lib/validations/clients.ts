import { z } from "zod";

export const quickCreateClientSchema = z.object({
  firstName: z
    .string({ required_error: "Le prénom est requis" })
    .min(1, "Le prénom est requis")
    .max(100, "Le prénom ne peut pas dépasser 100 caractères"),
  lastName: z
    .string({ required_error: "Le nom est requis" })
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  phone: z
    .string({ required_error: "Le téléphone est requis" })
    .min(1, "Le téléphone est requis")
    .max(30, "Le téléphone ne peut pas dépasser 30 caractères"),
  email: z
    .string({ required_error: "L'email est requis" })
    .min(1, "L'email est requis")
    .email("L'adresse email est invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
  licenseNumber: z
    .string()
    .max(50, "Le numéro de permis ne peut pas dépasser 50 caractères")
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  isTrusted: z.boolean().default(false),
});

export type QuickCreateClientData = z.infer<typeof quickCreateClientSchema>;
