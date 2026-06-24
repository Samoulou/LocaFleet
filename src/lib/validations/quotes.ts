import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} ne peut pas dépasser ${max} caractères`)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

export const quoteLineItemSchema = z.object({
  description: z
    .string()
    .min(1, "La description de la ligne est requise")
    .max(255, "La description ne peut pas dépasser 255 caractères"),
  quantity: z.coerce
    .number({ invalid_type_error: "La quantité doit être un nombre" })
    .positive("La quantité doit être positive"),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Le prix unitaire doit être un nombre" })
    .min(0, "Le prix unitaire ne peut pas être négatif"),
});

const quoteBaseSchema = z.object({
  clientId: z.string().uuid("L'identifiant du client est invalide"),
  fonctionId: z.string().uuid("L'identifiant de la fonction est invalide"),
  title: optionalText(255, "Le titre"),
  startDate: z
    .union([z.literal(""), z.coerce.date()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  endDate: z
    .union([z.literal(""), z.coerce.date()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  lineItems: z
    .array(quoteLineItemSchema)
    .min(1, "Au moins une ligne est requise"),
  validUntil: z
    .union([z.literal(""), z.coerce.date()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  notes: optionalText(2000, "Les notes"),
});

function quoteRefinements(
  data: { startDate?: Date; endDate?: Date },
  ctx: z.RefinementCtx
) {
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La date de fin doit être après la date de début",
      path: ["endDate"],
    });
  }
  if ((data.startDate && !data.endDate) || (!data.startDate && data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Renseignez les deux dates de la période, ou aucune",
      path: ["endDate"],
    });
  }
}

export const createQuoteSchema = quoteBaseSchema.superRefine(quoteRefinements);

export const updateQuoteSchema = quoteBaseSchema
  .extend({
    id: z.string().uuid("L'identifiant de l'offre est invalide"),
  })
  .superRefine(quoteRefinements);

export const updateQuoteStatusSchema = z.object({
  id: z.string().uuid("L'identifiant de l'offre est invalide"),
  status: z.enum(["draft", "sent", "accepted", "declined", "expired"], {
    errorMap: () => ({ message: "Le statut sélectionné est invalide" }),
  }),
});

export const listQuotesFiltersSchema = z.object({
  status: z
    .enum(["draft", "sent", "accepted", "declined", "expired"])
    .optional(),
  clientId: z.string().uuid().optional(),
  search: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type QuoteLineItemInput = z.infer<typeof quoteLineItemSchema>;
export type CreateQuoteData = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteData = z.infer<typeof updateQuoteSchema>;
export type UpdateQuoteStatusData = z.infer<typeof updateQuoteStatusSchema>;
