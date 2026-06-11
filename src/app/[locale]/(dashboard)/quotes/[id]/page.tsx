import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CalendarCheck, FileDown, Pencil } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getQuoteById } from "@/actions/quotes";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { formatCHF, formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { QuoteStatusActions } from "@/components/quotes/quote-status-actions";

type QuoteDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuoteDetailPage({
  params,
}: QuoteDetailPageProps) {
  const { id } = await params;

  const [t, result, currentUser] = await Promise.all([
    getTranslations("quotes"),
    getQuoteById(id),
    getCurrentUser(),
  ]);

  if (!result.success || !currentUser) {
    notFound();
  }

  const quote = result.data;
  const canUpdate = hasPermission(currentUser.role, "quotes", "update");
  const canDelete = hasPermission(currentUser.role, "quotes", "delete");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {quote.quoteNumber}
            </h1>
            <QuoteStatusBadge status={quote.status} />
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${quote.fonction.color ?? "#94A3B8"}1A`,
                color: quote.fonction.color ?? "#475569",
              }}
            >
              <span
                aria-hidden
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: quote.fonction.color ?? "#94A3B8" }}
              />
              {quote.fonction.name}
            </span>
          </div>
          {quote.title && (
            <p className="mt-1 text-sm text-muted-foreground">{quote.title}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/quotes/${quote.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileDown className="mr-2 size-4" />
              {t("detail.downloadPdf")}
            </a>
          </Button>
          {canUpdate && quote.status === "draft" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/quotes/${quote.id}/edit`}>
                <Pencil className="mr-2 size-4" />
                {t("detail.edit")}
              </Link>
            </Button>
          )}
          <QuoteStatusActions
            quoteId={quote.id}
            status={quote.status}
            alreadyConverted={quote.events.length > 0}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client + meta */}
        <div className="space-y-3 rounded-lg border p-4 text-sm">
          <h2 className="font-semibold text-foreground">{t("detail.info")}</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-muted-foreground">{t("detail.client")}</dt>
              <dd className="font-medium">
                <Link
                  href={`/clients/${quote.client.id}`}
                  className="text-primary hover:underline"
                >
                  {quote.client.firstName} {quote.client.lastName}
                </Link>
                {quote.client.companyName && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {quote.client.companyName}
                  </span>
                )}
              </dd>
            </div>
            {quote.startDate && quote.endDate && (
              <div>
                <dt className="text-muted-foreground">{t("detail.period")}</dt>
                <dd className="font-medium">
                  {formatDateTime(quote.startDate)} →{" "}
                  {formatDateTime(quote.endDate)}
                </dd>
              </div>
            )}
            {quote.validUntil && (
              <div>
                <dt className="text-muted-foreground">
                  {t("detail.validUntil")}
                </dt>
                <dd className="font-medium">{formatDate(quote.validUntil)}</dd>
              </div>
            )}
            {quote.notes && (
              <div>
                <dt className="text-muted-foreground">{t("detail.notes")}</dt>
                <dd className="whitespace-pre-wrap">{quote.notes}</dd>
              </div>
            )}
          </dl>

          {/* Linked events */}
          {quote.events.length > 0 && (
            <div className="border-t pt-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarCheck className="size-4" />
                {t("detail.linkedEvents")}
              </h3>
              <ul className="mt-2 space-y-1">
                {quote.events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/events/${event.id}`}
                      className="text-primary hover:underline"
                    >
                      {event.eventNumber}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Lines + totals */}
        <div className="rounded-lg border lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("detail.lineDescription")}</TableHead>
                <TableHead className="text-right">
                  {t("detail.lineQuantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("detail.lineUnitPrice")}
                </TableHead>
                <TableHead className="text-right">
                  {t("detail.lineTotal")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.lineItems.map((line, index) => (
                <TableRow key={index}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCHF(parseFloat(line.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCHF(parseFloat(line.totalPrice))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="space-y-1 border-t p-4 text-right text-sm">
            <p className="text-muted-foreground">
              {t("detail.subtotal")} :{" "}
              <span className="font-medium text-foreground">
                {formatCHF(parseFloat(quote.subtotal))}
              </span>
            </p>
            {parseFloat(quote.taxRate) > 0 && (
              <p className="text-muted-foreground">
                {t("detail.tax", { rate: quote.taxRate })} :{" "}
                <span className="font-medium text-foreground">
                  {formatCHF(parseFloat(quote.taxAmount))}
                </span>
              </p>
            )}
            <p className="text-base font-bold">
              {t("detail.total")} : {formatCHF(parseFloat(quote.totalAmount))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
