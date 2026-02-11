import { z } from "zod";

export const processPaymentSchema = z.object({
  invoiceId: z.string().uuid("L'identifiant de la facture est invalide"),
  amount: z.coerce
    .number({
      invalid_type_error: "Le montant doit être un nombre",
    })
    .positive("Le montant doit être supérieur à zéro"),
  method: z.enum(["cash_departure", "cash_return", "invoice", "card"], {
    errorMap: () => ({ message: "Le moyen de paiement est invalide" }),
  }),
  paidAt: z.coerce.date({
    errorMap: () => ({ message: "La date de paiement est invalide" }),
  }),
  reference: z
    .string()
    .max(255, "La référence ne peut pas dépasser 255 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  notes: z
    .string()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type ProcessPaymentData = z.infer<typeof processPaymentSchema>;
