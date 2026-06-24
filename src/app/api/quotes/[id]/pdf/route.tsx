import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { quotes, clients, fonctions, tenants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  QuotePdfDocument,
  type QuotePdfData,
} from "@/components/quotes/quote-pdf-template";
import type { QuoteLineItem } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser || !hasPermission(currentUser.role, "quotes", "read")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [quoteRow] = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        startDate: quotes.startDate,
        endDate: quotes.endDate,
        lineItems: quotes.lineItems,
        subtotal: quotes.subtotal,
        taxRate: quotes.taxRate,
        taxAmount: quotes.taxAmount,
        totalAmount: quotes.totalAmount,
        validUntil: quotes.validUntil,
        notes: quotes.notes,
        createdAt: quotes.createdAt,
        tenantId: quotes.tenantId,
        fonctionName: fonctions.name,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientEmail: clients.email,
        clientPhone: clients.phone,
        clientAddress: clients.address,
        clientCompanyName: clients.companyName,
      })
      .from(quotes)
      .innerJoin(fonctions, eq(quotes.fonctionId, fonctions.id))
      .innerJoin(clients, eq(quotes.clientId, clients.id))
      .where(
        and(eq(quotes.id, quoteId), eq(quotes.tenantId, currentUser.tenantId))
      );

    if (!quoteRow) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const [tenantRow] = await db
      .select({
        name: tenants.name,
        address: tenants.address,
        phone: tenants.phone,
        email: tenants.email,
      })
      .from(tenants)
      .where(eq(tenants.id, quoteRow.tenantId));

    const pdfData: QuotePdfData = {
      quoteNumber: quoteRow.quoteNumber,
      createdAt: quoteRow.createdAt.toISOString(),
      validUntil: quoteRow.validUntil,
      title: quoteRow.title,
      fonctionName: quoteRow.fonctionName,
      tenantName: tenantRow?.name ?? undefined,
      tenantAddress: tenantRow?.address ?? undefined,
      tenantPhone: tenantRow?.phone ?? undefined,
      tenantEmail: tenantRow?.email ?? undefined,
      client: {
        firstName: quoteRow.clientFirstName,
        lastName: quoteRow.clientLastName,
        email: quoteRow.clientEmail,
        phone: quoteRow.clientPhone,
        address: quoteRow.clientAddress,
        companyName: quoteRow.clientCompanyName,
      },
      period: {
        startDate: quoteRow.startDate?.toISOString() ?? null,
        endDate: quoteRow.endDate?.toISOString() ?? null,
      },
      lineItems: ((quoteRow.lineItems as QuoteLineItem[]) ?? []).map(
        (line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          totalPrice: line.totalPrice,
        })
      ),
      subtotal: quoteRow.subtotal,
      taxRate: quoteRow.taxRate ?? "0",
      taxAmount: quoteRow.taxAmount ?? "0",
      totalAmount: quoteRow.totalAmount,
      notes: quoteRow.notes,
    };

    const stream = await renderToStream(<QuotePdfDocument data={pdfData} />);

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="offre-${pdfData.quoteNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error(
      "Quote PDF generation error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
