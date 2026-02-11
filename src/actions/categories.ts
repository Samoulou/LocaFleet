"use server";

import { eq, and, count, asc, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { vehicleCategories, vehicles } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/lib/validations/categories";
import { z } from "zod";
import type { ActionResult } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type CategoryWithCount = {
  id: string;
  name: string;
  description: string | null;
  dailyRate: string | null;
  weeklyRate: string | null;
  sortOrder: number | null;
  vehicleCount: number;
};

// ============================================================================
// listCategoriesWithCount
// ============================================================================

export async function listCategoriesWithCount(): Promise<
  ActionResult<CategoryWithCount[]>
> {
  try {
    const currentUser = await requirePermission("settings", "read");

    const result = await db
      .select({
        id: vehicleCategories.id,
        name: vehicleCategories.name,
        description: vehicleCategories.description,
        dailyRate: vehicleCategories.dailyRate,
        weeklyRate: vehicleCategories.weeklyRate,
        sortOrder: vehicleCategories.sortOrder,
        vehicleCount: count(vehicles.id),
      })
      .from(vehicleCategories)
      .leftJoin(
        vehicles,
        and(
          eq(vehicles.categoryId, vehicleCategories.id),
          isNull(vehicles.deletedAt)
        )
      )
      .where(eq(vehicleCategories.tenantId, currentUser.tenantId))
      .groupBy(vehicleCategories.id)
      .orderBy(asc(vehicleCategories.sortOrder), asc(vehicleCategories.name));

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "listCategoriesWithCount error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des catégories",
    };
  }
}

// ============================================================================
// createCategory
// ============================================================================

export async function createCategory(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("settings", "create");

    const parsed = createCategorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const data = parsed.data;

    // Check name uniqueness within tenant
    const [existing] = await db
      .select({ id: vehicleCategories.id })
      .from(vehicleCategories)
      .where(
        and(
          eq(vehicleCategories.name, data.name),
          eq(vehicleCategories.tenantId, currentUser.tenantId)
        )
      );

    if (existing) {
      return {
        success: false,
        error: "Une catégorie avec ce nom existe déjà",
      };
    }

    const [created] = await db
      .insert(vehicleCategories)
      .values({
        tenantId: currentUser.tenantId,
        name: data.name,
        description: data.description ?? null,
        dailyRate: data.dailyRate?.toString() ?? null,
        weeklyRate: data.weeklyRate?.toString() ?? null,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning({ id: vehicleCategories.id });

    return { success: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "createCategory error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la création de la catégorie",
    };
  }
}

// ============================================================================
// updateCategory
// ============================================================================

export async function updateCategory(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("settings", "update");

    const parsed = updateCategorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { id, ...data } = parsed.data;

    // Verify category exists and belongs to tenant
    const [existingCategory] = await db
      .select({ id: vehicleCategories.id })
      .from(vehicleCategories)
      .where(
        and(
          eq(vehicleCategories.id, id),
          eq(vehicleCategories.tenantId, currentUser.tenantId)
        )
      );

    if (!existingCategory) {
      return { success: false, error: "Cette catégorie n'existe pas" };
    }

    // Check name uniqueness (excluding self)
    const [duplicate] = await db
      .select({ id: vehicleCategories.id })
      .from(vehicleCategories)
      .where(
        and(
          eq(vehicleCategories.name, data.name),
          eq(vehicleCategories.tenantId, currentUser.tenantId),
          ne(vehicleCategories.id, id)
        )
      );

    if (duplicate) {
      return {
        success: false,
        error: "Une catégorie avec ce nom existe déjà",
      };
    }

    const [updated] = await db
      .update(vehicleCategories)
      .set({
        name: data.name,
        description: data.description ?? null,
        dailyRate: data.dailyRate?.toString() ?? null,
        weeklyRate: data.weeklyRate?.toString() ?? null,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(vehicleCategories.id, id),
          eq(vehicleCategories.tenantId, currentUser.tenantId)
        )
      )
      .returning({ id: vehicleCategories.id });

    if (!updated) {
      return { success: false, error: "Cette catégorie n'existe pas" };
    }

    return { success: true, data: { id: updated.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "updateCategory error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la modification de la catégorie",
    };
  }
}

// ============================================================================
// deleteCategory
// ============================================================================

const uuidSchema = z.string().uuid();

export async function deleteCategory(id: string): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("settings", "delete");

    if (!uuidSchema.safeParse(id).success) {
      return { success: false, error: "Cette catégorie n'existe pas" };
    }

    // Verify category exists and belongs to tenant
    const [existing] = await db
      .select({ id: vehicleCategories.id })
      .from(vehicleCategories)
      .where(
        and(
          eq(vehicleCategories.id, id),
          eq(vehicleCategories.tenantId, currentUser.tenantId)
        )
      );

    if (!existing) {
      return { success: false, error: "Cette catégorie n'existe pas" };
    }

    // Check vehicle count
    const [countResult] = await db
      .select({ value: count() })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.categoryId, id),
          eq(vehicles.tenantId, currentUser.tenantId),
          isNull(vehicles.deletedAt)
        )
      );

    const vehicleCount = countResult?.value ?? 0;

    if (vehicleCount > 0) {
      return {
        success: false,
        error: `${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""} utilise${vehicleCount > 1 ? "nt" : ""} cette catégorie. Réassignez-les avant de supprimer.`,
      };
    }

    // Hard delete
    await db
      .delete(vehicleCategories)
      .where(
        and(
          eq(vehicleCategories.id, id),
          eq(vehicleCategories.tenantId, currentUser.tenantId)
        )
      );

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "deleteCategory error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la suppression de la catégorie",
    };
  }
}
