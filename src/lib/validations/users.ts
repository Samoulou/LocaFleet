import { z } from "zod";

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid("L'identifiant utilisateur est invalide"),
  role: z.enum(["admin", "agent", "viewer", "employee"], {
    errorMap: () => ({ message: "Le rôle sélectionné est invalide" }),
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const toggleUserActiveSchema = z.object({
  userId: z.string().uuid("L'identifiant utilisateur est invalide"),
  isActive: z.boolean({
    invalid_type_error: "La valeur active doit être un booléen",
  }),
});

export type ToggleUserActiveInput = z.infer<typeof toggleUserActiveSchema>;

// ============================================================================
// Employee/user creation & profile (CRM Phase 1)
// ============================================================================

const phoneSchema = z
  .string()
  .max(30, "Le téléphone ne peut pas dépasser 30 caractères")
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const hourlyRateSchema = z
  .union([
    z.literal(""),
    z.coerce
      .number({
        invalid_type_error: "Le taux horaire doit être un nombre",
      })
      .min(0, "Le taux horaire ne peut pas être négatif"),
  ])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const employmentTypeSchema = z
  .union([
    z.literal(""),
    z.enum(["salaried", "hourly"], {
      errorMap: () => ({
        message: "Le type d'emploi sélectionné est invalide",
      }),
    }),
  ])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const createUserSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(255, "Le nom ne peut pas dépasser 255 caractères"),
  email: z.string().email("L'adresse e-mail est invalide"),
  // Matches Better Auth emailAndPassword.minPasswordLength
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
    .max(128, "Le mot de passe ne peut pas dépasser 128 caractères"),
  role: z.enum(["admin", "agent", "viewer", "employee"], {
    errorMap: () => ({ message: "Le rôle sélectionné est invalide" }),
  }),
  phone: phoneSchema,
  hourlyRate: hourlyRateSchema,
  employmentType: employmentTypeSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserProfileSchema = z.object({
  userId: z.string().uuid("L'identifiant utilisateur est invalide"),
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(255, "Le nom ne peut pas dépasser 255 caractères"),
  phone: phoneSchema,
  hourlyRate: hourlyRateSchema,
  employmentType: employmentTypeSchema,
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
