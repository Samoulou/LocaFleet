import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * DbLike — minimal interface for Drizzle transaction objects.
 */
export type DbLike = {
  select: typeof db.select;
  insert: typeof db.insert;
  update: typeof db.update;
  execute: typeof db.execute;
};

/**
 * ContractError — business logic error (not auth).
 */
export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

/**
 * Acquire a PostgreSQL advisory transaction lock to prevent concurrent
 * number generation for the same tenant + entity type.
 *
 * Uses pg_advisory_xact_lock so the lock is automatically released at
 * transaction end.
 */
export async function acquireNumberLock(
  tx: DbLike,
  tenantId: string,
  entity: "contract" | "invoice" | "dossier"
): Promise<void> {
  // Build a 64-bit key from entity hash + tenant UUID hash
  const entityHash = entity.split("").reduce((h, c) => {
    h = (h << 5) - h + c.charCodeAt(0);
    return h & h;
  }, 0);
  const tenantHash = tenantId.split("-").join("").slice(0, 16);
  const key =
    (Math.abs(entityHash) % 0x7fffffff) * 0x100000000 +
    parseInt(tenantHash.slice(0, 8), 16);

  await tx.execute(sql`SELECT pg_advisory_xact_lock(${key}::bigint)`);
}

// ============================================================================
// Number generators (with advisory lock to prevent races on empty tables)
// ============================================================================

import { rentalContracts, invoices, rentalDossiers } from "@/db/schema";

export async function generateNextContractNumber(
  tenantId: string,
  tx: DbLike
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CTR-${currentYear}-`;

  await acquireNumberLock(tx, tenantId, "contract");

  const result = await tx.execute(
    sql`SELECT ${rentalContracts.contractNumber} FROM ${rentalContracts}
        WHERE ${rentalContracts.tenantId} = ${tenantId}
        ORDER BY ${rentalContracts.createdAt} DESC
        LIMIT 1`
  );

  const lastNumber = result[0]?.contract_number as string | undefined;
  if (lastNumber && lastNumber.startsWith(prefix)) {
    const seqStr = lastNumber.slice(prefix.length);
    const nextSeq = parseInt(seqStr, 10) + 1;
    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  return `${prefix}0001`;
}

export async function generateNextInvoiceNumber(
  tenantId: string,
  tx: DbLike
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `FAC-${currentYear}-`;

  await acquireNumberLock(tx, tenantId, "invoice");

  const result = await tx.execute(
    sql`SELECT ${invoices.invoiceNumber} FROM ${invoices}
        WHERE ${invoices.tenantId} = ${tenantId}
        ORDER BY ${invoices.createdAt} DESC
        LIMIT 1`
  );

  const lastNumber = result[0]?.invoice_number as string | undefined;
  if (lastNumber && lastNumber.startsWith(prefix)) {
    const seqStr = lastNumber.slice(prefix.length);
    const nextSeq = parseInt(seqStr, 10) + 1;
    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  return `${prefix}0001`;
}

export async function generateNextDossierNumber(
  tenantId: string,
  tx: DbLike
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `DOS-${currentYear}-`;

  await acquireNumberLock(tx, tenantId, "dossier");

  const result = await tx.execute(
    sql`SELECT ${rentalDossiers.dossierNumber} FROM ${rentalDossiers}
        WHERE ${rentalDossiers.tenantId} = ${tenantId}
        ORDER BY ${rentalDossiers.createdAt} DESC
        LIMIT 1`
  );

  const lastNumber = result[0]?.dossier_number as string | undefined;
  if (lastNumber && lastNumber.startsWith(prefix)) {
    const seqStr = lastNumber.slice(prefix.length);
    const nextSeq = parseInt(seqStr, 10) + 1;
    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  return `${prefix}0001`;
}
