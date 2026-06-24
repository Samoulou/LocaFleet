"use server";

import { eq, and } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  updateUserRoleSchema,
  toggleUserActiveSchema,
  createUserSchema,
  updateUserProfileSchema,
} from "@/lib/validations/users";
import { revalidatePath } from "next/cache";
import { getZodErrorMessage } from "@/lib/validations/utils";
import type { ActionResult, UserRole, EmploymentType } from "@/types";

export type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  hourlyRate: string | null;
  employmentType: EmploymentType | null;
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
          phone: users.phone,
          hourlyRate: users.hourlyRate,
          employmentType: users.employmentType,
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
        phone: users.phone,
        hourlyRate: users.hourlyRate,
        employmentType: users.employmentType,
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

export async function createUser(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("users", "create");

    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: getZodErrorMessage(parsed.error),
      };
    }

    const data = parsed.data;

    // Check email uniqueness within tenant
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.email, data.email),
          eq(users.tenantId, currentUser.tenantId)
        )
      );

    if (existing) {
      return {
        success: false,
        error: "Un utilisateur avec cette adresse e-mail existe déjà",
      };
    }

    const hashedPassword = await hashPassword(data.password);

    // User + credential account must be created atomically, otherwise the
    // user would exist without any way to log in.
    const createdId = await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          tenantId: currentUser.tenantId,
          email: data.email,
          name: data.name,
          role: data.role,
          emailVerified: true,
          isActive: true,
          phone: data.phone ?? null,
          hourlyRate: data.hourlyRate?.toString() ?? null,
          employmentType: data.employmentType ?? null,
        })
        .returning({ id: users.id });

      await tx.insert(accounts).values({
        userId: createdUser.id,
        accountId: createdUser.id,
        providerId: "credential",
        password: hashedPassword,
      });

      return createdUser.id;
    });

    revalidatePath("/settings/users");

    return { success: true, data: { id: createdId } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "createUser error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la création de l'utilisateur",
    };
  }
}

export async function updateUserProfile(
  input: unknown
): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("users", "update");

    const parsed = updateUserProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: getZodErrorMessage(parsed.error),
      };
    }

    const { userId, name, phone, hourlyRate, employmentType } = parsed.data;

    // Single atomic UPDATE — returns empty array if user not found in tenant
    const [updated] = await db
      .update(users)
      .set({
        name,
        phone: phone ?? null,
        hourlyRate: hourlyRate?.toString() ?? null,
        employmentType: employmentType ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(users.id, userId), eq(users.tenantId, currentUser.tenantId))
      )
      .returning({ id: users.id });

    if (!updated) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    revalidatePath("/settings/users");

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "updateUserProfile error:",
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
        error: getZodErrorMessage(parsed.error),
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

    revalidatePath("/settings");

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
        error: getZodErrorMessage(parsed.error),
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

    revalidatePath("/settings");

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
