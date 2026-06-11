import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} ne peut pas dépasser ${max} caractères`)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const agreedAmountSchema = z
  .union([
    z.literal(""),
    z.coerce
      .number({
        invalid_type_error: "Le montant convenu doit être un nombre",
      })
      .min(0, "Le montant convenu ne peut pas être négatif"),
  ])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const eventEmployeeSchema = z.object({
  userId: z.string().uuid("L'identifiant employé est invalide"),
  role: optionalText(100, "Le rôle"),
});

const eventBaseSchema = z.object({
  fonctionId: z.string().uuid("L'identifiant de la fonction est invalide"),
  clientId: z.string().uuid("L'identifiant du client est invalide"),
  title: z
    .string()
    .min(1, "Le titre est requis")
    .max(255, "Le titre ne peut pas dépasser 255 caractères"),
  startDate: z.coerce.date({
    errorMap: () => ({ message: "La date de début est invalide" }),
  }),
  endDate: z.coerce.date({
    errorMap: () => ({ message: "La date de fin est invalide" }),
  }),
  location: optionalText(500, "Le lieu"),
  destination: optionalText(500, "La destination"),
  description: optionalText(2000, "La description"),
  notes: optionalText(2000, "Les notes"),
  agreedAmount: agreedAmountSchema,
  vehicleIds: z
    .array(z.string().uuid("L'identifiant véhicule est invalide"))
    .default([]),
  employees: z.array(eventEmployeeSchema).default([]),
  // Two-phase warning flow: conflicts are returned first; resubmitting with
  // this flag set acknowledges them (warn, never forbid).
  acknowledgeConflicts: z.boolean().optional().default(false),
});

// Shared refinements over the base shape (works for create and update —
// superRefine preserves the schema's inferred output type)
function eventRefinements(
  data: {
    startDate: Date;
    endDate: Date;
    vehicleIds: string[];
    employees: { userId: string }[];
  },
  ctx: z.RefinementCtx
) {
  if (data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La date de fin doit être après la date de début",
      path: ["endDate"],
    });
  }
  if (new Set(data.vehicleIds).size !== data.vehicleIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Un véhicule ne peut être attribué qu'une seule fois",
      path: ["vehicleIds"],
    });
  }
  if (
    new Set(data.employees.map((e) => e.userId)).size !== data.employees.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Un employé ne peut être attribué qu'une seule fois",
      path: ["employees"],
    });
  }
}

export const createEventSchema = eventBaseSchema.superRefine(eventRefinements);

export const updateEventSchema = eventBaseSchema
  .extend({
    id: z.string().uuid("L'identifiant de l'événement est invalide"),
  })
  .superRefine(eventRefinements);

export const updateEventStatusSchema = z.object({
  id: z.string().uuid("L'identifiant de l'événement est invalide"),
  status: z.enum(
    ["draft", "confirmed", "in_progress", "completed", "cancelled"],
    {
      errorMap: () => ({ message: "Le statut sélectionné est invalide" }),
    }
  ),
});

export const checkEventConflictsSchema = z.object({
  startDate: z.coerce.date({
    errorMap: () => ({ message: "La date de début est invalide" }),
  }),
  endDate: z.coerce.date({
    errorMap: () => ({ message: "La date de fin est invalide" }),
  }),
  fonctionId: z
    .string()
    .uuid("L'identifiant de la fonction est invalide")
    .optional(),
  vehicleIds: z.array(z.string().uuid()).default([]),
  employeeUserIds: z.array(z.string().uuid()).default([]),
  excludeEventId: z.string().uuid().optional(),
});

export const listEventsFiltersSchema = z.object({
  status: z
    .enum(["draft", "confirmed", "in_progress", "completed", "cancelled"])
    .optional(),
  fonctionId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  search: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const addEventCommentSchema = z.object({
  eventId: z.string().uuid("L'identifiant de l'événement est invalide"),
  body: z
    .string()
    .min(1, "Le commentaire ne peut pas être vide")
    .max(2000, "Le commentaire ne peut pas dépasser 2000 caractères"),
});

export type CreateEventData = z.infer<typeof createEventSchema>;
export type UpdateEventData = z.infer<typeof updateEventSchema>;
export type UpdateEventStatusData = z.infer<typeof updateEventStatusSchema>;
export type CheckEventConflictsData = z.infer<typeof checkEventConflictsSchema>;
export type AddEventCommentData = z.infer<typeof addEventCommentSchema>;
