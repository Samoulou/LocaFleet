"use server";

import { eq, and, or, desc, count, ilike, isNull } from "drizzle-orm";
import { db } from "@/db";
import { quotes, events, fonctions, clients } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  createQuoteSchema,
  updateQuoteSchema,
  updateQuoteStatusSchema,
  listQuotesFiltersSchema,
} from "@/lib/validations/quotes";
import {
  generateNextQuoteNumber,
  generateNextEventNumber,
} from "@/lib/number-utils";
import { createAuditLog } from "@/actions/audit-logs";
import { getZodErrorMessage } from "@/lib/validations/utils";
import { revalidatePath } from "next/cache";
import type { ActionResult, QuoteStatus, QuoteLineItem } from "@/types";

// ============================================================================
// Types
// ============================================================================

class QuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteError";
  }
}

export type QuoteListItem = {
  id: string;
  quoteNumber: string;
  title: string | null;
  status: QuoteStatus;
  totalAmount: string;
  validUntil: string | null;
  createdAt: Date;
  fonctionName: string;
  fonctionColor: string | null;
  clientFirstName: string;
  clientLastName: string;
};

export type QuoteDetail = {
  id: string;
  quoteNumber: string;
  title: string | null;
  status: QuoteStatus;
  startDate: Date | null;
  endDate: Date | null;
  lineItems: QuoteLineItem[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  validUntil: string | null;
  quotePdfUrl: string | null;
  sentAt: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  fonction: {
    id: string;
    name: string;
    color: string | null;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    email: string;
    phone: string;
    address: string | null;
  };
  events: {
    id: string;
    eventNumber: string;
    status: string;
  }[];
};

// Quote lifecycle: drafts circulate, sent quotes get answered, terminal
// states are immutable.
const ALLOWED_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ["sent", "accepted", "declined"],
  sent: ["accepted", "declined", "expired"],
  accepted: [],
  declined: [],
  expired: [],
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// Internal helpers
// ============================================================================

function computeTotals(
  lines: { description: string; quantity: number; unitPrice: number }[]
): {
  lineItems: QuoteLineItem[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
} {
  const lineItems: QuoteLineItem[] = lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice.toFixed(2),
    totalPrice: (line.quantity * line.unitPrice).toFixed(2),
  }));

  const subtotal = lineItems.reduce(
    (sum, line) => sum + parseFloat(line.totalPrice),
    0
  );
  // TVA: 0 pour l'instant (réglage par fonction/tenant à trancher — voir
  // questions ouvertes du doc 24)
  const taxRate = 0;
  const taxAmount = (subtotal * taxRate) / 100;

  return {
    lineItems,
    subtotal: subtotal.toFixed(2),
    taxRate: taxRate.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    totalAmount: (subtotal + taxAmount).toFixed(2),
  };
}

async function verifyQuoteReferences(params: {
  tenantId: string;
  clientId: string;
  fonctionId: string;
}) {
  const [fonction] = await db
    .select({ id: fonctions.id, isActive: fonctions.isActive })
    .from(fonctions)
    .where(
      and(
        eq(fonctions.id, params.fonctionId),
        eq(fonctions.tenantId, params.tenantId)
      )
    );

  if (!fonction) {
    throw new QuoteError("Cette fonction n'existe pas");
  }
  if (!fonction.isActive) {
    throw new QuoteError("Cette fonction est désactivée");
  }

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, params.clientId),
        eq(clients.tenantId, params.tenantId),
        isNull(clients.deletedAt)
      )
    );

  if (!client) {
    throw new QuoteError("Ce client n'existe pas");
  }
}

function handleQuoteActionError(
  err: unknown,
  context: string
): { success: false; error: string } {
  if (err instanceof AuthorizationError || err instanceof QuoteError) {
    return { success: false, error: err.message };
  }
  console.error(
    `${context} error:`,
    err instanceof Error ? err.message : "Unknown error"
  );
  return { success: false, error: "Une erreur est survenue" };
}

// ============================================================================
// createQuote
// ============================================================================

export async function createQuote(
  input: unknown
): Promise<ActionResult<{ id: string; quoteNumber: string }>> {
  try {
    const currentUser = await requirePermission("quotes", "create");

    const parsed = createQuoteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const data = parsed.data;

    await verifyQuoteReferences({
      tenantId: currentUser.tenantId,
      clientId: data.clientId,
      fonctionId: data.fonctionId,
    });

    const totals = computeTotals(data.lineItems);

    let quoteId = "";
    let quoteNumber = "";

    await db.transaction(async (tx) => {
      quoteNumber = await generateNextQuoteNumber(currentUser.tenantId, tx);

      const [created] = await tx
        .insert(quotes)
        .values({
          tenantId: currentUser.tenantId,
          quoteNumber,
          clientId: data.clientId,
          fonctionId: data.fonctionId,
          title: data.title ?? null,
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
          lineItems: totals.lineItems,
          subtotal: totals.subtotal,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          validUntil: data.validUntil
            ? data.validUntil.toISOString().slice(0, 10)
            : null,
          notes: data.notes ?? null,
          createdByUserId: currentUser.id,
        })
        .returning({ id: quotes.id });

      quoteId = created.id;

      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "quote.created",
          entityType: "quote",
          entityId: created.id,
          metadata: { quoteNumber, totalAmount: totals.totalAmount },
        },
        tx
      );
    });

    revalidatePath("/quotes");

    return { success: true, data: { id: quoteId, quoteNumber } };
  } catch (err) {
    return handleQuoteActionError(err, "createQuote");
  }
}

// ============================================================================
// updateQuote — drafts only (sent/accepted quotes are immutable snapshots)
// ============================================================================

export async function updateQuote(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("quotes", "update");

    const parsed = updateQuoteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const { id, ...data } = parsed.data;

    const [existing] = await db
      .select({ id: quotes.id, status: quotes.status })
      .from(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, currentUser.tenantId)));

    if (!existing) {
      return { success: false, error: "Cette offre n'existe pas" };
    }

    if (existing.status !== "draft") {
      return {
        success: false,
        error: "Seule une offre en brouillon peut être modifiée",
      };
    }

    await verifyQuoteReferences({
      tenantId: currentUser.tenantId,
      clientId: data.clientId,
      fonctionId: data.fonctionId,
    });

    const totals = computeTotals(data.lineItems);

    await db
      .update(quotes)
      .set({
        clientId: data.clientId,
        fonctionId: data.fonctionId,
        title: data.title ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        lineItems: totals.lineItems,
        subtotal: totals.subtotal,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        validUntil: data.validUntil
          ? data.validUntil.toISOString().slice(0, 10)
          : null,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, currentUser.tenantId)));

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);

    return { success: true, data: { id } };
  } catch (err) {
    return handleQuoteActionError(err, "updateQuote");
  }
}

// ============================================================================
// updateQuoteStatus — state machine with timestamps
// ============================================================================

export async function updateQuoteStatus(
  input: unknown
): Promise<ActionResult<{ status: QuoteStatus }>> {
  try {
    const currentUser = await requirePermission("quotes", "update");

    const parsed = updateQuoteStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const { id, status: targetStatus } = parsed.data;

    const [existing] = await db
      .select({ id: quotes.id, status: quotes.status })
      .from(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, currentUser.tenantId)));

    if (!existing) {
      return { success: false, error: "Cette offre n'existe pas" };
    }

    if (!ALLOWED_TRANSITIONS[existing.status].includes(targetStatus)) {
      return {
        success: false,
        error: "Cette transition de statut n'est pas autorisée",
      };
    }

    const now = new Date();
    await db
      .update(quotes)
      .set({
        status: targetStatus,
        sentAt: targetStatus === "sent" ? now : undefined,
        acceptedAt: targetStatus === "accepted" ? now : undefined,
        declinedAt: targetStatus === "declined" ? now : undefined,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, currentUser.tenantId)));

    await createAuditLog({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      action: "quote.status_changed",
      entityType: "quote",
      entityId: id,
      changes: { from: existing.status, to: targetStatus },
    });

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);

    return { success: true, data: { status: targetStatus } };
  } catch (err) {
    return handleQuoteActionError(err, "updateQuoteStatus");
  }
}

// ============================================================================
// convertQuoteToEvent — accepted quotes become draft events
// ============================================================================

export async function convertQuoteToEvent(
  quoteId: string
): Promise<ActionResult<{ eventId: string; eventNumber: string }>> {
  try {
    // Creating an event requires the events permission too
    const currentUser = await requirePermission("events", "create");

    if (!UUID_REGEX.test(quoteId)) {
      return { success: false, error: "Cette offre n'existe pas" };
    }

    const [quote] = await db
      .select({
        id: quotes.id,
        status: quotes.status,
        quoteNumber: quotes.quoteNumber,
        clientId: quotes.clientId,
        fonctionId: quotes.fonctionId,
        title: quotes.title,
        startDate: quotes.startDate,
        endDate: quotes.endDate,
        totalAmount: quotes.totalAmount,
        notes: quotes.notes,
      })
      .from(quotes)
      .where(
        and(eq(quotes.id, quoteId), eq(quotes.tenantId, currentUser.tenantId))
      );

    if (!quote) {
      return { success: false, error: "Cette offre n'existe pas" };
    }

    if (quote.status !== "accepted") {
      return {
        success: false,
        error: "Seule une offre acceptée peut être convertie en événement",
      };
    }

    if (!quote.startDate || !quote.endDate) {
      return {
        success: false,
        error:
          "Renseignez la période de l'offre avant de la convertir en événement",
      };
    }

    // One event per quote: block double conversion
    const [alreadyConverted] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.quoteId, quoteId),
          eq(events.tenantId, currentUser.tenantId)
        )
      );

    if (alreadyConverted) {
      return {
        success: false,
        error: "Cette offre a déjà été convertie en événement",
      };
    }

    let eventId = "";
    let eventNumber = "";

    await db.transaction(async (tx) => {
      eventNumber = await generateNextEventNumber(currentUser.tenantId, tx);

      const [created] = await tx
        .insert(events)
        .values({
          tenantId: currentUser.tenantId,
          eventNumber,
          fonctionId: quote.fonctionId,
          clientId: quote.clientId,
          title: quote.title ?? quote.quoteNumber,
          startDate: quote.startDate as Date,
          endDate: quote.endDate as Date,
          agreedAmount: quote.totalAmount,
          notes: quote.notes,
          quoteId: quote.id,
          createdByUserId: currentUser.id,
        })
        .returning({ id: events.id });

      eventId = created.id;

      await createAuditLog(
        {
          tenantId: currentUser.tenantId,
          userId: currentUser.id,
          action: "quote.converted_to_event",
          entityType: "quote",
          entityId: quote.id,
          metadata: { eventId: created.id, eventNumber },
        },
        tx
      );
    });

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath("/events");
    revalidatePath("/planning");

    return { success: true, data: { eventId, eventNumber } };
  } catch (err) {
    return handleQuoteActionError(err, "convertQuoteToEvent");
  }
}

// ============================================================================
// listQuotes
// ============================================================================

export type ListQuotesResult = {
  items: QuoteListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listQuotes(
  input?: unknown
): Promise<ActionResult<ListQuotesResult>> {
  try {
    const currentUser = await requirePermission("quotes", "read");

    const parsed = listQuotesFiltersSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const filters = parsed.data;

    const conditions = [eq(quotes.tenantId, currentUser.tenantId)];

    if (filters.status) {
      conditions.push(eq(quotes.status, filters.status));
    }
    if (filters.clientId) {
      conditions.push(eq(quotes.clientId, filters.clientId));
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      const searchCondition = or(
        ilike(quotes.title, term),
        ilike(quotes.quoteNumber, term)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const whereClause = and(...conditions);

    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          title: quotes.title,
          status: quotes.status,
          totalAmount: quotes.totalAmount,
          validUntil: quotes.validUntil,
          createdAt: quotes.createdAt,
          fonctionName: fonctions.name,
          fonctionColor: fonctions.color,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
        })
        .from(quotes)
        .innerJoin(fonctions, eq(quotes.fonctionId, fonctions.id))
        .innerJoin(clients, eq(quotes.clientId, clients.id))
        .where(whereClause)
        .orderBy(desc(quotes.createdAt))
        .limit(filters.pageSize)
        .offset((filters.page - 1) * filters.pageSize),
      db.select({ value: count() }).from(quotes).where(whereClause),
    ]);

    return {
      success: true,
      data: {
        items,
        total: totalRows[0]?.value ?? 0,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    };
  } catch (err) {
    return handleQuoteActionError(err, "listQuotes");
  }
}

// ============================================================================
// getQuoteById
// ============================================================================

export async function getQuoteById(
  id: string
): Promise<ActionResult<QuoteDetail>> {
  try {
    const currentUser = await requirePermission("quotes", "read");

    if (!UUID_REGEX.test(id)) {
      return { success: false, error: "Cette offre n'existe pas" };
    }

    const [row] = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        status: quotes.status,
        startDate: quotes.startDate,
        endDate: quotes.endDate,
        lineItems: quotes.lineItems,
        subtotal: quotes.subtotal,
        taxRate: quotes.taxRate,
        taxAmount: quotes.taxAmount,
        totalAmount: quotes.totalAmount,
        validUntil: quotes.validUntil,
        quotePdfUrl: quotes.quotePdfUrl,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
        declinedAt: quotes.declinedAt,
        notes: quotes.notes,
        createdAt: quotes.createdAt,
        fonctionId: fonctions.id,
        fonctionName: fonctions.name,
        fonctionColor: fonctions.color,
        clientId: clients.id,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientCompanyName: clients.companyName,
        clientEmail: clients.email,
        clientPhone: clients.phone,
        clientAddress: clients.address,
      })
      .from(quotes)
      .innerJoin(fonctions, eq(quotes.fonctionId, fonctions.id))
      .innerJoin(clients, eq(quotes.clientId, clients.id))
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, currentUser.tenantId)));

    if (!row) {
      return { success: false, error: "Cette offre n'existe pas" };
    }

    const linkedEvents = await db
      .select({
        id: events.id,
        eventNumber: events.eventNumber,
        status: events.status,
      })
      .from(events)
      .where(
        and(eq(events.quoteId, id), eq(events.tenantId, currentUser.tenantId))
      );

    return {
      success: true,
      data: {
        id: row.id,
        quoteNumber: row.quoteNumber,
        title: row.title,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        lineItems: (row.lineItems as QuoteLineItem[]) ?? [],
        subtotal: row.subtotal,
        taxRate: row.taxRate ?? "0",
        taxAmount: row.taxAmount ?? "0",
        totalAmount: row.totalAmount,
        validUntil: row.validUntil,
        quotePdfUrl: row.quotePdfUrl,
        sentAt: row.sentAt,
        acceptedAt: row.acceptedAt,
        declinedAt: row.declinedAt,
        notes: row.notes,
        createdAt: row.createdAt,
        fonction: {
          id: row.fonctionId,
          name: row.fonctionName,
          color: row.fonctionColor,
        },
        client: {
          id: row.clientId,
          firstName: row.clientFirstName,
          lastName: row.clientLastName,
          companyName: row.clientCompanyName,
          email: row.clientEmail,
          phone: row.clientPhone,
          address: row.clientAddress,
        },
        events: linkedEvents,
      },
    };
  } catch (err) {
    return handleQuoteActionError(err, "getQuoteById");
  }
}

// ============================================================================
// deleteQuote — drafts only
// ============================================================================

export async function deleteQuote(id: string): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("quotes", "delete");

    if (!UUID_REGEX.test(id)) {
      return { success: false, error: "Cette offre n'existe pas" };
    }

    const [existing] = await db
      .select({ id: quotes.id, status: quotes.status })
      .from(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, currentUser.tenantId)));

    if (!existing) {
      return { success: false, error: "Cette offre n'existe pas" };
    }

    if (existing.status !== "draft") {
      return {
        success: false,
        error: "Seule une offre en brouillon peut être supprimée",
      };
    }

    await db
      .delete(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, currentUser.tenantId)));

    revalidatePath("/quotes");

    return { success: true, data: undefined };
  } catch (err) {
    return handleQuoteActionError(err, "deleteQuote");
  }
}
