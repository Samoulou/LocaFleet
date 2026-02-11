"use server";

import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import type { ActionResult } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type CreateAuditLogParams = {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: unknown;
  metadata: unknown;
  createdAt: Date;
  userName: string | null;
};

// ============================================================================
// createAuditLog — inserts into auditLogs table
// Accepts optional transaction (trx) to participate in the same tx
// ============================================================================

type DbLike = {
  insert: typeof db.insert;
};

export async function createAuditLog(
  params: CreateAuditLogParams,
  trx?: DbLike
) {
  const dbConn = trx ?? db;

  await dbConn.insert(auditLogs).values({
    tenantId: params.tenantId,
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    changes: params.changes ?? null,
    metadata: params.metadata ?? null,
  });
}

// ============================================================================
// getEntityAuditLogs — fetches audit logs for a given entity
// ============================================================================

export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<ActionResult<AuditLogEntry[]>> {
  try {
    const currentUser = await requirePermission("vehicles", "read");

    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        changes: auditLogs.changes,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          eq(auditLogs.tenantId, currentUser.tenantId),
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return { success: true, data: logs };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getEntityAuditLogs error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des logs",
    };
  }
}
