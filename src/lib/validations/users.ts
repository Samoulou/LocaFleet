import { z } from "zod";

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid("L'identifiant utilisateur est invalide"),
  role: z.enum(["admin", "agent", "viewer"], {
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
