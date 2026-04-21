import { z } from "zod";

export const validateReturnSchema = z.object({
  contractId: z.string().uuid("L'identifiant du contrat est invalide"),
  damagesAmount: z.coerce
    .number()
    .min(0, "Le montant des dommages ne peut pas être négatif")
    .max(100000, "Le montant des dommages ne peut pas dépasser 100'000 CHF")
    .optional()
    .default(0),
});

export type ValidateReturnInput = z.infer<typeof validateReturnSchema>;
