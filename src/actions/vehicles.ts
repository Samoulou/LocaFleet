"use server";

import { eq, and, or, ilike, isNull, count, asc } from "drizzle-orm";
import { db } from "@/db";
import { vehicles, vehicleCategories } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import { vehicleListParamsSchema } from "@/lib/validations/vehicles";
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
