import { z } from "zod";

export const globalSearchSchema = z.object({
  query: z
    .string({ required_error: "La recherche est requise" })
    .min(2, "La recherche doit contenir au moins 2 caractères")
    .max(100, "La recherche ne peut pas dépasser 100 caractères"),
});

export type GlobalSearchInput = z.infer<typeof globalSearchSchema>;
