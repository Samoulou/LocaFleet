"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  updateUserRoleSchema,
  toggleUserActiveSchema,
} from "@/lib/validations/users";
import type { ActionResult, UserRole } from "@/types";

export type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
};

export async function listUsers(): Promise<ActionResult<UserListItem[]>> {
  try {
    const currentUser = await requirePermission("users", "read");

    // Admin sees all users in tenant; agent/viewer see only self
    if (currentUser.role === "admin") {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.tenantId, currentUser.tenantId));

      return { success: true, data: result };
    }

    // Agent/viewer: return only self
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, currentUser.tenantId),
          eq(users.id, currentUser.id)
        )
      );

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "listUsers error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

export async function updateUserRole(
  input: unknown
): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("users", "update");

    const parsed = updateUserRoleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { userId, role } = parsed.data;

    // Cannot change own role
    if (userId === currentUser.id) {
      return {
        success: false,
        error: "Vous ne pouvez pas modifier votre propre rôle",
      };
    }

    // Single atomic UPDATE — returns empty array if user not found in tenant
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(
        and(eq(users.id, userId), eq(users.tenantId, currentUser.tenantId))
      )
      .returning({ id: users.id });

    if (!updated) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "updateUserRole error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

export async function toggleUserActive(
  input: unknown
): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("users", "update");

    const parsed = toggleUserActiveSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { userId, isActive } = parsed.data;

    // Cannot deactivate self
    if (userId === currentUser.id) {
      return {
        success: false,
        error: "Vous ne pouvez pas modifier votre propre statut",
      };
    }

    // Single atomic UPDATE — returns empty array if user not found in tenant
    const [updated] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(eq(users.id, userId), eq(users.tenantId, currentUser.tenantId))
      )
      .returning({ id: users.id });

    if (!updated) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "toggleUserActive error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}
