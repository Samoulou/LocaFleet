"use server";

import { eq, and, or, ilike, isNull, ne, count, asc } from "drizzle-orm";
import { db } from "@/db";
import { vehicles, vehicleCategories } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import { vehicleListParamsSchema } from "@/lib/validations/vehicles";
import {
  vehicleFormSchema,
  vehicleUpdateSchema,
} from "@/lib/validations/vehicle-form";
import { z } from "zod";
import type { ActionResult, VehicleStatus } from "@/types";

export type VehicleListItem = {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  categoryId: string | null;
  categoryName: string | null;
  mileage: number;
  status: VehicleStatus;
  coverPhotoUrl: string | null;
};

export type VehicleListResult = {
  vehicles: VehicleListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type VehicleCategoryOption = {
  id: string;
  name: string;
};

export type VehicleDetail = {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  year: number | null;
  color: string | null;
  vin: string | null;
  mileage: number;
  categoryId: string | null;
  fuelType: "gasoline" | "diesel" | "electric" | "hybrid" | null;
  transmission: "manual" | "automatic" | null;
  seats: number | null;
  notes: string | null;
};

export async function listVehicles(
  input: unknown
): Promise<ActionResult<VehicleListResult>> {
  try {
    const currentUser = await requirePermission("vehicles", "read");

    const parsed = vehicleListParamsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { page, pageSize, status, category, search } = parsed.data;
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions = [
      eq(vehicles.tenantId, currentUser.tenantId),
      isNull(vehicles.deletedAt),
    ];

    if (status) {
      conditions.push(eq(vehicles.status, status));
    }

    if (category) {
      conditions.push(eq(vehicles.categoryId, category));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(vehicles.brand, pattern),
          ilike(vehicles.model, pattern),
          ilike(vehicles.plateNumber, pattern)
        )!
      );
    }

    const whereClause = and(...conditions);

    // Execute data + count queries in parallel
    const [data, countResult] = await Promise.all([
      db
        .select({
          id: vehicles.id,
          brand: vehicles.brand,
          model: vehicles.model,
          plateNumber: vehicles.plateNumber,
          categoryId: vehicles.categoryId,
          categoryName: vehicleCategories.name,
          mileage: vehicles.mileage,
          status: vehicles.status,
          coverPhotoUrl: vehicles.coverPhotoUrl,
        })
        .from(vehicles)
        .leftJoin(
          vehicleCategories,
          eq(vehicles.categoryId, vehicleCategories.id)
        )
        .where(whereClause)
        .orderBy(asc(vehicles.brand), asc(vehicles.model))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(vehicles).where(whereClause),
    ]);

    const totalCount = countResult[0]?.value ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      data: {
        vehicles: data.map((v) => ({
          ...v,
          categoryName: v.categoryName ?? null,
        })),
        totalCount,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "listVehicles error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des véhicules",
    };
  }
}

export async function listVehicleCategories(): Promise<
  ActionResult<VehicleCategoryOption[]>
> {
  try {
    const currentUser = await requirePermission("vehicles", "read");

    const result = await db
      .select({
        id: vehicleCategories.id,
        name: vehicleCategories.name,
      })
      .from(vehicleCategories)
      .where(eq(vehicleCategories.tenantId, currentUser.tenantId))
      .orderBy(asc(vehicleCategories.sortOrder), asc(vehicleCategories.name));

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "listVehicleCategories error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des catégories",
    };
  }
}

// ============================================================================
// getVehicle
// ============================================================================

const uuidSchema = z.string().uuid();

export async function getVehicle(
  id: string
): Promise<ActionResult<VehicleDetail>> {
  try {
    const currentUser = await requirePermission("vehicles", "read");

    if (!uuidSchema.safeParse(id).success) {
      return { success: false, error: "Ce véhicule n'existe pas" };
    }

    const [vehicle] = await db
      .select({
        id: vehicles.id,
        brand: vehicles.brand,
        model: vehicles.model,
        plateNumber: vehicles.plateNumber,
        year: vehicles.year,
        color: vehicles.color,
        vin: vehicles.vin,
        mileage: vehicles.mileage,
        categoryId: vehicles.categoryId,
        fuelType: vehicles.fuelType,
        transmission: vehicles.transmission,
        seats: vehicles.seats,
        notes: vehicles.notes,
      })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, id),
          eq(vehicles.tenantId, currentUser.tenantId),
          isNull(vehicles.deletedAt)
        )
      );

    if (!vehicle) {
      return { success: false, error: "Ce véhicule n'existe pas" };
    }

    return { success: true, data: vehicle };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getVehicle error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement du véhicule",
    };
  }
}

// ============================================================================
// createVehicle
// ============================================================================

export async function createVehicle(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("vehicles", "create");

    const parsed = vehicleFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const data = parsed.data;

    // Check plate uniqueness + category ownership in parallel
    const [plateResult, categoryResult] = await Promise.all([
      db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.plateNumber, data.plateNumber),
            eq(vehicles.tenantId, currentUser.tenantId),
            isNull(vehicles.deletedAt)
          )
        ),
      db
        .select({ id: vehicleCategories.id })
        .from(vehicleCategories)
        .where(
          and(
            eq(vehicleCategories.id, data.categoryId),
            eq(vehicleCategories.tenantId, currentUser.tenantId)
          )
        ),
    ]);

    if (plateResult[0]) {
      return {
        success: false,
        error: "Ce numéro d'immatriculation existe déjà",
      };
    }

    if (!categoryResult[0]) {
      return { success: false, error: "Cette catégorie n'existe pas" };
    }

    const [created] = await db
      .insert(vehicles)
      .values({
        tenantId: currentUser.tenantId,
        brand: data.brand,
        model: data.model,
        plateNumber: data.plateNumber,
        mileage: data.mileage,
        year: data.year ?? null,
        color: data.color ?? null,
        vin: data.vin ?? null,
        categoryId: data.categoryId,
        fuelType: data.fuelType ?? null,
        transmission: data.transmission ?? null,
        seats: data.seats ?? null,
        notes: data.notes ?? null,
      })
      .returning({ id: vehicles.id });

    return { success: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "createVehicle error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la création du véhicule",
    };
  }
}

// ============================================================================
// updateVehicle
// ============================================================================

export async function updateVehicle(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("vehicles", "update");

    const parsed = vehicleUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { id, ...data } = parsed.data;

    // Verify vehicle exists, belongs to tenant, not soft-deleted
    const [existing] = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, id),
          eq(vehicles.tenantId, currentUser.tenantId),
          isNull(vehicles.deletedAt)
        )
      );

    if (!existing) {
      return { success: false, error: "Ce véhicule n'existe pas" };
    }

    // Check plate uniqueness + category ownership in parallel
    const [plateResult, categoryResult] = await Promise.all([
      db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.plateNumber, data.plateNumber),
            eq(vehicles.tenantId, currentUser.tenantId),
            isNull(vehicles.deletedAt),
            ne(vehicles.id, id)
          )
        ),
      db
        .select({ id: vehicleCategories.id })
        .from(vehicleCategories)
        .where(
          and(
            eq(vehicleCategories.id, data.categoryId),
            eq(vehicleCategories.tenantId, currentUser.tenantId)
          )
        ),
    ]);

    if (plateResult[0]) {
      return {
        success: false,
        error: "Ce numéro d'immatriculation existe déjà",
      };
    }

    if (!categoryResult[0]) {
      return { success: false, error: "Cette catégorie n'existe pas" };
    }

    const [updated] = await db
      .update(vehicles)
      .set({
        brand: data.brand,
        model: data.model,
        plateNumber: data.plateNumber,
        mileage: data.mileage,
        year: data.year ?? null,
        color: data.color ?? null,
        vin: data.vin ?? null,
        categoryId: data.categoryId,
        fuelType: data.fuelType ?? null,
        transmission: data.transmission ?? null,
        seats: data.seats ?? null,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(vehicles.id, id),
          eq(vehicles.tenantId, currentUser.tenantId),
          isNull(vehicles.deletedAt)
        )
      )
      .returning({ id: vehicles.id });

    if (!updated) {
      return { success: false, error: "Ce véhicule n'existe pas" };
    }

    return { success: true, data: { id: updated.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "updateVehicle error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la modification du véhicule",
    };
  }
}
