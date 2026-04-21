import { z } from "zod";

export const quickCreateClientSchema = z.object({
  firstName: z
    .string({ required_error: "Le prenom est requis" })
    .min(1, "Le prenom est requis")
    .max(100, "Le prenom ne peut pas depasser 100 caracteres"),
  lastName: z
    .string({ required_error: "Le nom est requis" })
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas depasser 100 caracteres"),
  phone: z
    .string({ required_error: "Le telephone est requis" })
    .min(1, "Le telephone est requis")
    .max(30, "Le telephone ne peut pas depasser 30 caracteres"),
  email: z
    .string({ required_error: "L'email est requis" })
    .min(1, "L'email est requis")
    .email("L'adresse email est invalide")
    .max(255, "L'email ne peut pas depasser 255 caracteres"),
  licenseNumber: z
    .string()
    .max(50, "Le numero de permis ne peut pas depasser 50 caracteres")
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  isTrusted: z.boolean().default(false),
});

export type QuickCreateClientData = z.infer<typeof quickCreateClientSchema>;

export const clientFormSchema = z.object({
  firstName: z
    .string({ required_error: "Le prenom est requis" })
    .min(1, "Le prenom est requis")
    .max(100, "Le prenom ne peut pas depasser 100 caracteres"),
  lastName: z
    .string({ required_error: "Le nom est requis" })
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas depasser 100 caracteres"),
  email: z
    .string({ required_error: "L'email est requis" })
    .min(1, "L'email est requis")
    .email("L'adresse email est invalide")
    .max(255, "L'email ne peut pas depasser 255 caracteres"),
  phone: z
    .string({ required_error: "Le telephone est requis" })
    .min(1, "Le telephone est requis")
    .max(30, "Le telephone ne peut pas depasser 30 caracteres"),
  dateOfBirth: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  address: z
    .string()
    .max(1000, "L'adresse ne peut pas depasser 1000 caracteres")
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  licenseNumber: z
    .string()
    .max(50, "Le numero de permis ne peut pas depasser 50 caracteres")
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  licenseCategory: z
    .string()
    .max(20, "La categorie ne peut pas depasser 20 caracteres")
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  licenseExpiry: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  identityDocType: z
    .string()
    .max(50)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  identityDocNumber: z
    .string()
    .max(50, "Le numero de piece ne peut pas depasser 50 caracteres")
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  companyName: z
    .string()
    .max(255, "Le nom de l'entreprise ne peut pas depasser 255 caracteres")
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  notes: z
    .string()
    .max(2000, "Les notes ne peuvent pas depasser 2000 caracteres")
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  isTrusted: z.boolean().default(false),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

export type ClientFormFieldErrors = Partial<
  Record<keyof ClientFormData, string>
>;

// ============================================================================
// Client list params (pagination + search + sort)
// ============================================================================

export const clientListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .max(255, "La recherche ne peut pas depasser 255 caracteres")
    .optional(),
  sortBy: z
    .enum(["firstName", "lastName", "email", "phone", "createdAt", "isTrusted"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ClientListParams = z.infer<typeof clientListParamsSchema>;

// ============================================================================
// Create / Update client (server-side validation)
// ============================================================================

export const createClientSchema = clientFormSchema;
export type CreateClientData = z.infer<typeof createClientSchema>;

export const updateClientSchema = clientFormSchema;
export type UpdateClientData = z.infer<typeof updateClientSchema>;
