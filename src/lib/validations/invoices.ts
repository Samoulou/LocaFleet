import { z } from "zod";

export const closeContractSchema = z.object({
  contractId: z.string().uuid("L'identifiant du contrat est invalide"),
  actualReturnDate: z.coerce.date({
    errorMap: () => ({ message: "La date de retour est invalide" }),
  }),
  returnMileage: z.coerce
    .number({
      invalid_type_error: "Le kilométrage de retour doit être un nombre",
    })
    .int("Le kilométrage de retour doit être un nombre entier")
    .min(0, "Le kilométrage de retour ne peut pas être négatif"),
  damagesAmount: z.coerce
    .number({
      invalid_type_error: "Le montant des dégâts doit être un nombre",
    })
    .min(0, "Le montant des dégâts ne peut pas être négatif")
    .optional()
    .default(0),
  notes: z
    .string()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .optional(),
});

export type CloseContractData = z.infer<typeof closeContractSchema>;

// ============================================================================
// Invoice List Params
// ============================================================================

export const invoiceListParamsSchema = z.object({
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
    .enum(
      ["pending", "invoiced", "verification", "paid", "conflict", "cancelled"],
      {
        errorMap: () => ({ message: "Le statut sélectionné est invalide" }),
      }
    )
    .optional(),
  search: z
    .string()
    .max(100, "La recherche ne peut pas dépasser 100 caractères")
    .optional(),
  period: z
    .enum(["this_month", "last_month", "this_quarter", "this_year"], {
      errorMap: () => ({ message: "La période sélectionnée est invalide" }),
    })
    .optional(),
});

export type InvoiceListParams = z.infer<typeof invoiceListParamsSchema>;

// ============================================================================
// Update Invoice Status
// ============================================================================

export const updateInvoiceStatusSchema = z.object({
  invoiceId: z.string().uuid("L'identifiant de la facture est invalide"),
  newStatus: z.enum(["invoiced", "cancelled"], {
    errorMap: () => ({ message: "Le nouveau statut est invalide" }),
  }),
});

export type UpdateInvoiceStatusData = z.infer<typeof updateInvoiceStatusSchema>;
