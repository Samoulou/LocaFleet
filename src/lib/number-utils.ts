import { sql, like, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { rentalContracts, invoices, rentalDossiers } from "@/db/schema";

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
// Number generators — scan all rows to find true max sequence
// ============================================================================

function safeParseSeq(seqStr: string): number | null {
  const n = parseInt(seqStr, 10);
  if (Number.isNaN(n) || n < 1) return null;
  return n;
}

export async function generateNextContractNumber(
  tenantId: string,
  tx: DbLike
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CTR-${currentYear}-`;

  await acquireNumberLock(tx, tenantId, "contract");

  // Query ALL numbers for this year prefix, then find the max valid sequence.
  // This handles mixed formats (seeded S001, real 0001) gracefully.
  const rows = await tx
    .select({ contractNumber: rentalContracts.contractNumber })
    .from(rentalContracts)
    .where(
      and(
        eq(rentalContracts.tenantId, tenantId),
        like(rentalContracts.contractNumber, `${prefix}%`)
      )
    );

  let maxSeq = 0;
  for (const row of rows) {
    const num = row.contractNumber;
    if (typeof num !== "string") continue;
    const seq = safeParseSeq(num.slice(prefix.length));
    if (seq !== null && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export async function generateNextInvoiceNumber(
  tenantId: string,
  tx: DbLike
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `FAC-${currentYear}-`;

  await acquireNumberLock(tx, tenantId, "invoice");

  const rows = await tx
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        like(invoices.invoiceNumber, `${prefix}%`)
      )
    );

  let maxSeq = 0;
  for (const row of rows) {
    const num = row.invoiceNumber;
    if (typeof num !== "string") continue;
    const seq = safeParseSeq(num.slice(prefix.length));
    if (seq !== null && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export async function generateNextDossierNumber(
  tenantId: string,
  tx: DbLike
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `DOS-${currentYear}-`;

  await acquireNumberLock(tx, tenantId, "dossier");

  const rows = await tx
    .select({ dossierNumber: rentalDossiers.dossierNumber })
    .from(rentalDossiers)
    .where(
      and(
        eq(rentalDossiers.tenantId, tenantId),
        like(rentalDossiers.dossierNumber, `${prefix}%`)
      )
    );

  let maxSeq = 0;
  for (const row of rows) {
    const num = row.dossierNumber;
    if (typeof num !== "string") continue;
    const seq = safeParseSeq(num.slice(prefix.length));
    if (seq !== null && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}
