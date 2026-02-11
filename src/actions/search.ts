"use server";

import { eq, and, or, ilike, isNull } from "drizzle-orm";
import { db } from "@/db";
import { vehicles, clients, rentalContracts } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import { globalSearchSchema } from "@/lib/validations/search";
import type { ActionResult } from "@/types";

export type SearchResultItem = {
  id: string;
  type: "vehicle" | "client" | "contract";
  title: string;
  subtitle: string;
  href: string;
};

export type SearchResults = {
  vehicles: SearchResultItem[];
  clients: SearchResultItem[];
  contracts: SearchResultItem[];
};

export async function globalSearch(
  input: unknown
): Promise<ActionResult<SearchResults>> {
  try {
    const currentUser = await requirePermission("vehicles", "read");

    const parsed = globalSearchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides",
      };
    }

    const { query } = parsed.data;
    const pattern = `%${query}%`;
    const { tenantId } = currentUser;

    const [vehicleResults, clientResults, contractResults] = await Promise.all([
      db
        .select({
          id: vehicles.id,
          brand: vehicles.brand,
          model: vehicles.model,
          plateNumber: vehicles.plateNumber,
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.tenantId, tenantId),
            isNull(vehicles.deletedAt),
            or(
              ilike(vehicles.plateNumber, pattern),
              ilike(vehicles.brand, pattern),
              ilike(vehicles.model, pattern)
            )
          )
        )
        .limit(5),

      db
        .select({
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
        })
        .from(clients)
        .where(
          and(
            eq(clients.tenantId, tenantId),
            isNull(clients.deletedAt),
            or(
              ilike(clients.firstName, pattern),
              ilike(clients.lastName, pattern),
              ilike(clients.email, pattern)
            )
          )
        )
        .limit(5),

      db
        .select({
          id: rentalContracts.id,
          contractNumber: rentalContracts.contractNumber,
          status: rentalContracts.status,
        })
        .from(rentalContracts)
        .where(
          and(
            eq(rentalContracts.tenantId, tenantId),
            ilike(rentalContracts.contractNumber, pattern)
          )
        )
        .limit(5),
    ]);

    const results: SearchResults = {
      vehicles: vehicleResults.map((v) => ({
        id: v.id,
        type: "vehicle" as const,
        title: `${v.brand} ${v.model}`,
        subtitle: v.plateNumber,
        href: `/vehicles/${v.id}`,
      })),
      clients: clientResults.map((c) => ({
        id: c.id,
        type: "client" as const,
        title: `${c.firstName} ${c.lastName}`,
        subtitle: c.email,
        href: `/clients/${c.id}`,
      })),
      contracts: contractResults.map((ct) => ({
        id: ct.id,
        type: "contract" as const,
        title: ct.contractNumber,
        subtitle: ct.status,
        href: `/contracts/${ct.id}`,
      })),
    };

    return { success: true, data: results };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "globalSearch error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}
