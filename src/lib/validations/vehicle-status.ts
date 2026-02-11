import { z } from "zod";
import type { VehicleStatus } from "@/types";

// ============================================================================
// Allowed status transitions
// ============================================================================

export const ALLOWED_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  available: ["maintenance", "out_of_service"],
  rented: [], // blocked — must end contract first
  maintenance: ["available", "out_of_service"],
  out_of_service: ["available", "maintenance"],
};

// ============================================================================
// Zod schema
// ============================================================================

export const changeVehicleStatusSchema = z
  .object({
    vehicleId: z.string().uuid("ID de véhicule invalide"),
    newStatus: z.enum(
      ["available", "rented", "maintenance", "out_of_service"],
      {
        errorMap: () => ({ message: "Statut invalide" }),
      }
    ),
    reason: z
      .string()
      .max(500, "La raison ne doit pas dépasser 500 caractères")
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    createMaintenanceRecord: z.boolean().optional().default(false),
    maintenanceDescription: z
      .string()
      .max(2000, "La description ne doit pas dépasser 2000 caractères")
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    maintenanceType: z
      .enum([
        "regular_service",
        "repair",
        "technical_inspection",
        "tires",
        "other",
      ])
      .optional(),
  })
  .refine(
    (data) => {
      if (data.createMaintenanceRecord && !data.maintenanceDescription) {
        return false;
      }
      return true;
    },
    {
      message: "La description de maintenance est requise",
      path: ["maintenanceDescription"],
    }
  )
  .refine(
    (data) => {
      if (data.createMaintenanceRecord && !data.maintenanceType) {
        return false;
      }
      return true;
    },
    {
      message: "Le type de maintenance est requis",
      path: ["maintenanceType"],
    }
  );

export type ChangeVehicleStatusInput = z.infer<
  typeof changeVehicleStatusSchema
>;
