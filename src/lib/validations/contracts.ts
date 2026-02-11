import { z } from "zod";

export const createContractSchema = z
  .object({
    vehicleId: z.string().uuid("L'identifiant du véhicule est invalide"),
    clientId: z.string().uuid("L'identifiant du client est invalide"),
    startDate: z.coerce.date({
      errorMap: () => ({ message: "La date de début est invalide" }),
    }),
    endDate: z.coerce.date({
      errorMap: () => ({ message: "La date de fin est invalide" }),
    }),
    paymentMethod: z.enum(
      ["cash_departure", "cash_return", "invoice", "card"],
      {
        errorMap: () => ({ message: "Le moyen de paiement est invalide" }),
      }
    ),
    selectedOptionIds: z.array(z.string().uuid()).default([]),
    includedKmPerDay: z
      .union([
        z.literal(""),
        z.coerce
          .number({
            invalid_type_error: "Le nombre de km inclus doit être un nombre",
          })
          .int("Le nombre de km doit être un entier")
          .min(0, "Le nombre de km ne peut pas être négatif"),
      ])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    excessKmRate: z
      .union([
        z.literal(""),
        z.coerce
          .number({
            invalid_type_error: "Le tarif km excédentaire doit être un nombre",
          })
          .min(0, "Le tarif km excédentaire ne peut pas être négatif"),
      ])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    depositAmount: z
      .union([
        z.literal(""),
        z.coerce
          .number({
            invalid_type_error: "Le montant de la caution doit être un nombre",
          })
          .min(0, "Le montant de la caution ne peut pas être négatif"),
      ])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    pickupLocation: z
      .string()
      .max(255, "Le lieu de retrait ne peut pas dépasser 255 caractères")
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    returnLocation: z
      .string()
      .max(255, "Le lieu de retour ne peut pas dépasser 255 caractères")
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    notes: z
      .string()
      .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endDate"],
  });

export type CreateContractData = z.infer<typeof createContractSchema>;
