"use server";

import {
  eq,
  and,
  or,
  ilike,
  isNull,
  ne,
  count,
  asc,
  desc,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  vehicles,
  vehicleCategories,
  vehiclePhotos,
  rentalContracts,
  clients,
  maintenanceRecords,
} from "@/db/schema";
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

// ============================================================================
// getVehicleWithPhotos — full detail for the vehicle detail page
// ============================================================================

export type VehicleDetailFull = {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  year: number | null;
  color: string | null;
  vin: string | null;
  mileage: number;
  categoryId: string | null;
  categoryName: string | null;
  fuelType: "gasoline" | "diesel" | "electric" | "hybrid" | null;
  transmission: "manual" | "automatic" | null;
  seats: number | null;
  notes: string | null;
  status: VehicleStatus;
  coverPhotoUrl: string | null;
  dailyRateOverride: string | null;
  weeklyRateOverride: string | null;
  createdAt: Date;
  updatedAt: Date;
  photos: Array<{
    id: string;
    url: string;
    fileName: string | null;
    isCover: boolean | null;
    sortOrder: number | null;
    createdAt: Date;
  }>;
};

export async function getVehicleWithPhotos(
  id: string
): Promise<ActionResult<VehicleDetailFull>> {
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
        categoryName: vehicleCategories.name,
        fuelType: vehicles.fuelType,
        transmission: vehicles.transmission,
        seats: vehicles.seats,
        notes: vehicles.notes,
        status: vehicles.status,
        coverPhotoUrl: vehicles.coverPhotoUrl,
        dailyRateOverride: vehicles.dailyRateOverride,
        weeklyRateOverride: vehicles.weeklyRateOverride,
        createdAt: vehicles.createdAt,
        updatedAt: vehicles.updatedAt,
      })
      .from(vehicles)
      .leftJoin(
        vehicleCategories,
        eq(vehicles.categoryId, vehicleCategories.id)
      )
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

    const photos = await db
      .select({
        id: vehiclePhotos.id,
        url: vehiclePhotos.url,
        fileName: vehiclePhotos.fileName,
        isCover: vehiclePhotos.isCover,
        sortOrder: vehiclePhotos.sortOrder,
        createdAt: vehiclePhotos.createdAt,
      })
      .from(vehiclePhotos)
      .where(eq(vehiclePhotos.vehicleId, id))
      .orderBy(asc(vehiclePhotos.sortOrder), asc(vehiclePhotos.createdAt));

    return {
      success: true,
      data: {
        ...vehicle,
        categoryName: vehicle.categoryName ?? null,
        photos,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getVehicleWithPhotos error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement du véhicule",
    };
  }
}

// ============================================================================
// getVehicleRentalHistory
// ============================================================================

export type VehicleRentalHistoryItem = {
  id: string;
  contractNumber: string;
  clientFirstName: string;
  clientLastName: string;
  startDate: Date;
  endDate: Date;
  actualReturnDate: Date | null;
  totalAmount: string;
  status: "draft" | "active" | "completed" | "cancelled";
};

export async function getVehicleRentalHistory(
  vehicleId: string
): Promise<ActionResult<VehicleRentalHistoryItem[]>> {
  try {
    const currentUser = await requirePermission("vehicles", "read");

    if (!uuidSchema.safeParse(vehicleId).success) {
      return { success: false, error: "Identifiant de véhicule invalide" };
    }

    const data = await db
      .select({
        id: rentalContracts.id,
        contractNumber: rentalContracts.contractNumber,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        startDate: rentalContracts.startDate,
        endDate: rentalContracts.endDate,
        actualReturnDate: rentalContracts.actualReturnDate,
        totalAmount: rentalContracts.totalAmount,
        status: rentalContracts.status,
      })
      .from(rentalContracts)
      .innerJoin(
        clients,
        and(
          eq(rentalContracts.clientId, clients.id),
          eq(clients.tenantId, currentUser.tenantId)
        )
      )
      .where(
        and(
          eq(rentalContracts.vehicleId, vehicleId),
          eq(rentalContracts.tenantId, currentUser.tenantId)
        )
      )
      .orderBy(desc(rentalContracts.startDate));

    return { success: true, data };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getVehicleRentalHistory error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors du chargement de l'historique des locations",
    };
  }
}

// ============================================================================
// getVehicleMaintenanceHistory
// ============================================================================

export type VehicleMaintenanceHistoryItem = {
  id: string;
  type:
    | "regular_service"
    | "repair"
    | "technical_inspection"
    | "tires"
    | "other";
  status: "open" | "in_progress" | "completed";
  description: string;
  estimatedCost: string | null;
  finalCost: string | null;
  startDate: Date;
  endDate: Date | null;
  mechanicName: string | null;
};

export async function getVehicleMaintenanceHistory(
  vehicleId: string
): Promise<ActionResult<VehicleMaintenanceHistoryItem[]>> {
  try {
    const currentUser = await requirePermission("vehicles", "read");

    if (!uuidSchema.safeParse(vehicleId).success) {
      return { success: false, error: "Identifiant de véhicule invalide" };
    }

    const data = await db
      .select({
        id: maintenanceRecords.id,
        type: maintenanceRecords.type,
        status: maintenanceRecords.status,
        description: maintenanceRecords.description,
        estimatedCost: maintenanceRecords.estimatedCost,
        finalCost: maintenanceRecords.finalCost,
        startDate: maintenanceRecords.startDate,
        endDate: maintenanceRecords.endDate,
        mechanicName: maintenanceRecords.mechanicName,
      })
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.vehicleId, vehicleId),
          eq(maintenanceRecords.tenantId, currentUser.tenantId)
        )
      )
      .orderBy(desc(maintenanceRecords.startDate));

    return { success: true, data };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getVehicleMaintenanceHistory error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors du chargement de l'historique de maintenance",
    };
  }
}

// ============================================================================
// getVehicleKPIs — fleet overview counts
// ============================================================================

export type VehicleKPIs = {
  total: number;
  available: number;
  rented: number;
  maintenance: number;
};

export async function getVehicleKPIs(): Promise<ActionResult<VehicleKPIs>> {
  try {
    const currentUser = await requirePermission("vehicles", "read");

    const [result] = await db
      .select({
        total: count(),
        available:
          sql<number>`count(*) filter (where ${vehicles.status} = 'available')`.mapWith(
            Number
          ),
        rented:
          sql<number>`count(*) filter (where ${vehicles.status} = 'rented')`.mapWith(
            Number
          ),
        maintenance:
          sql<number>`count(*) filter (where ${vehicles.status} = 'maintenance')`.mapWith(
            Number
          ),
      })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.tenantId, currentUser.tenantId),
          isNull(vehicles.deletedAt)
        )
      );

    return {
      success: true,
      data: {
        total: result?.total ?? 0,
        available: result?.available ?? 0,
        rented: result?.rented ?? 0,
        maintenance: result?.maintenance ?? 0,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getVehicleKPIs error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des indicateurs",
    };
  }
}
