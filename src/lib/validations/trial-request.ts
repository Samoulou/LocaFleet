import { z } from "zod";

export const FLEET_SIZES = [
  "1-10",
  "11-30",
  "31-60",
  "61-100",
  "100+",
] as const;

export const trialRequestSchema = z.object({
  companyName: z
    .string()
    .min(1, "Le nom de l'entreprise est requis")
    .max(255, "Le nom de l'entreprise ne peut pas dépasser 255 caractères"),
  contactName: z
    .string()
    .min(1, "Le nom du contact est requis")
    .max(255, "Le nom du contact ne peut pas dépasser 255 caractères"),
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("L'email est invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
  phone: z
    .string()
    .max(30, "Le téléphone ne peut pas dépasser 30 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  fleetSize: z.enum(FLEET_SIZES, {
    errorMap: () => ({ message: "La taille de flotte est requise" }),
  }),
  message: z
    .string()
    .max(2000, "Le message ne peut pas dépasser 2000 caractères")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  locale: z.enum(["fr", "en"]).default("fr"),
  // Honeypot: hidden field bots fill in — checked in the action, which
  // fakes success instead of returning a validation error
  website: z.string().max(255).optional(),
});

export type TrialRequestData = z.infer<typeof trialRequestSchema>;

export type TrialRequestFieldErrors = Partial<
  Record<keyof TrialRequestData, string>
>;
