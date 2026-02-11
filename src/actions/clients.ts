"use server";

import { eq, and, or, ilike, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import { quickCreateClientSchema } from "@/lib/validations/clients";
import type { ActionResult } from "@/types";
import type { ClientSelectItem } from "@/actions/contracts";

// ============================================================================
// searchClients — debounced autocomplete search
// ============================================================================

export async function searchClients(
  query: string
): Promise<ActionResult<ClientSelectItem[]>> {
  try {
    const currentUser = await requirePermission("contracts", "create");
    const { tenantId } = currentUser;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return { success: true, data: [] };
    }

    const pattern = `%${trimmed}%`;

    const results = await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        isTrusted: clients.isTrusted,
      })
      .from(clients)
      .where(
        and(
          eq(clients.tenantId, tenantId),
          isNull(clients.deletedAt),
          or(
            ilike(clients.firstName, pattern),
            ilike(clients.lastName, pattern),
            ilike(clients.email, pattern),
            ilike(clients.phone, pattern)
          )
        )
      )
      .limit(10);

    return { success: true, data: results };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "searchClients error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// quickCreateClient — create a client from the contract form
// ============================================================================

export async function quickCreateClient(
  input: unknown
): Promise<ActionResult<ClientSelectItem>> {
  try {
    const currentUser = await requirePermission("contracts", "create");
    const { tenantId } = currentUser;

    const parsed = quickCreateClientSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { firstName, lastName, phone, email, licenseNumber, isTrusted } =
      parsed.data;

    const [inserted] = await db
      .insert(clients)
      .values({
        tenantId,
        firstName,
        lastName,
        phone,
        email,
        licenseNumber: licenseNumber ?? null,
        isTrusted,
      })
      .returning({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        isTrusted: clients.isTrusted,
      });

    if (!inserted) {
      return { success: false, error: "Erreur lors de la création du client" };
    }

    return { success: true, data: inserted };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "quickCreateClient error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}
