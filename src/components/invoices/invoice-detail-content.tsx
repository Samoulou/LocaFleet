"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ExternalLink,
  Download,
  FileText,
  CreditCard,
  Loader2,
  User,
  Car,
  FileSignature,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { PaymentDialog } from "@/components/invoices/payment-dialog";
import { updateInvoiceStatus } from "@/actions/invoices";
import { formatCHF, formatDate } from "@/lib/utils";
import type { InvoiceDetail } from "@/types";

type InvoiceDetailContentProps = {
  invoice: InvoiceDetail;
};

export function InvoiceDetailContent({ invoice }: InvoiceDetailContentProps) {
  const t = useTranslations("invoices.detail");
  const tMethods = useTranslations("payments.process.methods");
  const router = useRouter();
  const [statusLoading, setStatusLoading] = useState(false);

  async function handleMarkAsInvoiced() {
    setStatusLoading(true);
    try {
      const result = await updateInvoiceStatus({
        invoiceId: invoice.id,
        newStatus: "invoiced",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("statusUpdated"));
      router.refresh();
    } finally {
      setStatusLoading(false);
    }
  }

  const canMarkAsInvoiced = invoice.status === "pending";
  const canRecordPayment =
    invoice.status !== "paid" && invoice.status !== "cancelled";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 size-4" />
              {t("backToList")}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {invoice.invoiceNumber}
            </h2>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canMarkAsInvoiced && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAsInvoiced}
              disabled={statusLoading}
            >
              {statusLoading ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <FileText className="mr-1.5 size-3.5" />
              )}
              {t("markAsInvoiced")}
            </Button>
          )}

          {canRecordPayment && (
            <PaymentDialog
              invoiceId={invoice.id}
              invoiceAmount={invoice.balance}
            />
          )}

          {invoice.invoicePdfUrl ? (
            <a
              href={invoice.invoicePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 size-3.5" />
                {t("downloadPdf")}
              </Button>
            </a>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-1.5 size-3.5" />
              {t("downloadPdf")}
            </Button>
          )}

          <Link href={`/contracts/${invoice.contract.id}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1.5 size-3.5" />
              {t("viewContract")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Issued date */}
      {invoice.issuedAt && (
        <p className="text-sm text-muted-foreground">
          {t("issuedAt", { date: formatDate(invoice.issuedAt) })}
        </p>
      )}

      {/* 3 Info Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Client Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("clientCard")}
            </span>
          </div>
          <p className="font-medium text-foreground">
            {invoice.client.firstName} {invoice.client.lastName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{invoice.client.email}</p>
          <p className="text-sm text-muted-foreground">{invoice.client.phone}</p>
          <Link
            href={`/clients/${invoice.client.id}`}
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            {t("viewProfile")}
            <ExternalLink className="size-3" />
          </Link>
        </div>

        {/* Vehicle Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Car className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("vehicleCard")}
            </span>
          </div>
          <p className="font-medium text-foreground">
            {invoice.vehicle.brand} {invoice.vehicle.model}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoice.vehicle.plateNumber}
          </p>
          <Link
            href={`/vehicles/${invoice.vehicle.id}`}
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            {t("viewProfile")}
            <ExternalLink className="size-3" />
          </Link>
        </div>

        {/* Contract Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileSignature className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("contractCard")}
            </span>
          </div>
          <p className="font-medium text-foreground">
            {invoice.contract.contractNumber ?? "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(invoice.contract.startDate)} —{" "}
            {formatDate(invoice.contract.endDate)}
          </p>
          <Link
            href={`/contracts/${invoice.contract.id}`}
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            {t("viewProfile")}
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t("lineItemsTitle")}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("colDescription")}
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("colQuantity")}
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("colUnitPrice")}
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("colTotal")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.lineItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted">
                  <td className="px-5 py-3 text-sm text-foreground">
                    {item.description}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                    {item.quantity}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                    {formatCHF(parseFloat(item.unitPrice))}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-foreground">
                    {formatCHF(parseFloat(item.totalPrice))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td
                  colSpan={3}
                  className="px-5 py-2 text-right text-sm text-muted-foreground"
                >
                  {t("subtotal")}
                </td>
                <td className="px-5 py-2 text-right text-sm text-foreground">
                  {formatCHF(parseFloat(invoice.subtotal))}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-2 text-right text-sm text-muted-foreground"
                >
                  {t("tax", { rate: invoice.taxRate })}
                </td>
                <td className="px-5 py-2 text-right text-sm text-foreground">
                  {formatCHF(parseFloat(invoice.taxAmount))}
                </td>
              </tr>
              <tr className="border-t-2 border-border">
                <td
                  colSpan={3}
                  className="px-5 py-3 text-right text-sm font-bold text-foreground"
                >
                  {t("total")}
                </td>
                <td className="px-5 py-3 text-right text-sm font-bold text-foreground">
                  {formatCHF(parseFloat(invoice.totalAmount))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t("paymentsTitle")}
          </h3>
        </div>

        {invoice.payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CreditCard className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">{t("noPayments")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("colDate")}
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("colAmount")}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("colMethod")}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("colReference")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted">
                    <td className="px-5 py-3 text-sm text-foreground">
                      {formatDate(payment.paidAt)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-foreground">
                      {formatCHF(parseFloat(payment.amount))}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {tMethods(payment.method)}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {payment.reference ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={4} className="px-5 py-3 text-sm text-foreground">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {t("paidSummary", {
                          paid: formatCHF(invoice.totalPaid),
                          total: formatCHF(parseFloat(invoice.totalAmount)),
                        })}
                      </span>
                      <span className="font-bold">
                        {t("balance", { amount: formatCHF(invoice.balance) })}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      {invoice.notes && invoice.notes.trim() !== "" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {t("notesTitle")}
          </h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {invoice.notes}
          </p>
        </div>
      )}
    </div>
  );
}
