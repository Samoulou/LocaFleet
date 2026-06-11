"use server";

import { eq, and, asc, ne } from "drizzle-orm";
import { db } from "@/db";
import { fonctions } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  createFonctionSchema,
  updateFonctionSchema,
  toggleFonctionActiveSchema,
} from "@/lib/validations/fonctions";
import { getZodErrorMessage } from "@/lib/validations/utils";
import { revalidatePath } from "next/cache";
import type { ActionResult, TimeEntryUnit } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type FonctionListItem = {
  id: string;
  name: string;
  color: string | null;
  requiresEmployees: boolean;
  allowsContract: boolean;
  defaultTimeUnit: TimeEntryUnit | null;
  isActive: boolean;
  sortOrder: number | null;
};

// ============================================================================
// listFonctions
// ============================================================================

export async function listFonctions(): Promise<
  ActionResult<FonctionListItem[]>
> {
  try {
    const currentUser = await requirePermission("settings", "read");

    const result = await db
      .select({
        id: fonctions.id,
        name: fonctions.name,
        color: fonctions.color,
        requiresEmployees: fonctions.requiresEmployees,
        allowsContract: fonctions.allowsContract,
        defaultTimeUnit: fonctions.defaultTimeUnit,
        isActive: fonctions.isActive,
        sortOrder: fonctions.sortOrder,
      })
      .from(fonctions)
      .where(eq(fonctions.tenantId, currentUser.tenantId))
      .orderBy(asc(fonctions.sortOrder), asc(fonctions.name));

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "listFonctions error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des fonctions",
    };
  }
}

// ============================================================================
// createFonction
// ============================================================================

export async function createFonction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("settings", "create");

    const parsed = createFonctionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: getZodErrorMessage(parsed.error),
      };
    }

    const data = parsed.data;

    // Check name uniqueness within tenant
    const [existing] = await db
      .select({ id: fonctions.id })
      .from(fonctions)
      .where(
        and(
          eq(fonctions.name, data.name),
          eq(fonctions.tenantId, currentUser.tenantId)
        )
      );

    if (existing) {
      return {
        success: false,
        error: "Une fonction avec ce nom existe déjà",
      };
    }

    const [created] = await db
      .insert(fonctions)
      .values({
        tenantId: currentUser.tenantId,
        name: data.name,
        color: data.color ?? null,
        requiresEmployees: data.requiresEmployees,
        allowsContract: data.allowsContract,
        defaultTimeUnit: data.defaultTimeUnit ?? null,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning({ id: fonctions.id });

    revalidatePath("/settings/fonctions");

    return { success: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "createFonction error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la création de la fonction",
    };
  }
}

// ============================================================================
// updateFonction
// ============================================================================

export async function updateFonction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("settings", "update");

    const parsed = updateFonctionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: getZodErrorMessage(parsed.error),
      };
    }

    const { id, ...data } = parsed.data;

    // Verify fonction exists and belongs to tenant
    const [existingFonction] = await db
      .select({ id: fonctions.id })
      .from(fonctions)
      .where(
        and(eq(fonctions.id, id), eq(fonctions.tenantId, currentUser.tenantId))
      );

    if (!existingFonction) {
      return { success: false, error: "Cette fonction n'existe pas" };
    }

    // Check name uniqueness (excluding self)
    const [duplicate] = await db
      .select({ id: fonctions.id })
      .from(fonctions)
      .where(
        and(
          eq(fonctions.name, data.name),
          eq(fonctions.tenantId, currentUser.tenantId),
          ne(fonctions.id, id)
        )
      );

    if (duplicate) {
      return {
        success: false,
        error: "Une fonction avec ce nom existe déjà",
      };
    }

    const [updated] = await db
      .update(fonctions)
      .set({
        name: data.name,
        color: data.color ?? null,
        requiresEmployees: data.requiresEmployees,
        allowsContract: data.allowsContract,
        defaultTimeUnit: data.defaultTimeUnit ?? null,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(
        and(eq(fonctions.id, id), eq(fonctions.tenantId, currentUser.tenantId))
      )
      .returning({ id: fonctions.id });

    if (!updated) {
      return { success: false, error: "Cette fonction n'existe pas" };
    }

    revalidatePath("/settings/fonctions");

    return { success: true, data: { id: updated.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "updateFonction error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la modification de la fonction",
    };
  }
}

// ============================================================================
// toggleFonctionActive
// ============================================================================

// No hard delete: events will reference fonctions in later phases, so
// deactivation is the only way to retire one (mirrors rentalOptions).
export async function toggleFonctionActive(
  input: unknown
): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("settings", "update");

    const parsed = toggleFonctionActiveSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: getZodErrorMessage(parsed.error),
      };
    }

    const { id, isActive } = parsed.data;

    // Single atomic UPDATE — returns empty array if not found in tenant
    const [updated] = await db
      .update(fonctions)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(eq(fonctions.id, id), eq(fonctions.tenantId, currentUser.tenantId))
      )
      .returning({ id: fonctions.id });

    if (!updated) {
      return { success: false, error: "Cette fonction n'existe pas" };
    }

    revalidatePath("/settings/fonctions");

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "toggleFonctionActive error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la modification de la fonction",
    };
  }
}
