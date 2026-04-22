"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  User,
  Car,
  CalendarDays,
  BadgeCheck,
  FileText,
  MapPin,
  ClipboardCheck,
  ClipboardList,
  Archive,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractStatusBadge } from "@/components/contracts/contract-status-badge";
import { ValidateReturnDialog } from "@/components/contracts/validate-return-dialog";
import { approveContract } from "@/actions/approve-contract";
import { cn, formatCHF } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import type { ContractDetail as ContractDetailType } from "@/actions/get-contract";
import type { InvoiceStatus } from "@/types";

// ============================================================================
// Invoice status badge (inline, lightweight)
// ============================================================================

const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  invoiced: "bg-primary/10 text-primary",
  verification: "bg-purple-500/10 text-purple-500",
  paid: "bg-green-500/10 text-green-500",
  conflict: "bg-red-500/10 text-red-500",
  cancelled: "bg-muted text-muted-foreground",
};

// ============================================================================
// Helpers
// ============================================================================

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ============================================================================
// Component
// ============================================================================

type ContractDetailProps = {
  contract: ContractDetailType;
};

export function ContractDetail({ contract }: ContractDetailProps) {
  const t = useTranslations("contracts.detail");
  const tInvoiceStatus = useTranslations("contracts.invoiceStatus");
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [validateReturnOpen, setValidateReturnOpen] = useState(false);

  const isCompleted = contract.status === "completed";

  const paymentMethodKey = contract.paymentMethod as
    | "cash_departure"
    | "cash_return"
    | "invoice"
    | "card"
    | null;

  // Build line items for pricing table
  const lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }> = [];

  // Base rental
  lineItems.push({
    description: `${t("baseRental")} (${contract.totalDays}j × ${formatCHF(parseFloat(contract.dailyRate))})`,
    quantity: contract.totalDays,
    unitPrice: contract.dailyRate,
    totalPrice: contract.baseAmount,
  });

  // Options
  for (const opt of contract.options) {
    lineItems.push({
      description: opt.name,
      quantity: opt.quantity ?? 1,
      unitPrice: opt.dailyPrice,
      totalPrice: opt.totalPrice,
    });
  }

  async function handleApprove() {
    setApproving(true);
    const result = await approveContract({ contractId: contract.id });
    setApproving(false);

    if (result.success) {
      toast.success(
        t("approveSuccess", { invoiceNumber: result.data.invoiceNumber })
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {t("title", { contractNumber: contract.contractNumber })}
            </h1>
            <ContractStatusBadge status={contract.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("createdAt", { date: formatDateShort(contract.createdAt) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isCompleted && (
            <>
              {contract.status === "draft" && (
                <Button onClick={handleApprove} disabled={approving}>
                  {approving ? t("approving") : t("approveButton")}
                </Button>
              )}
              {(contract.status === "approved" ||
                contract.status === "pending_cg") && (
                <Button asChild>
                  <Link href={`/contracts/${contract.id}/inspection/departure`}>
                    <ClipboardCheck className="mr-2 size-4" />
                    {t("departureInspection")}
                  </Link>
                </Button>
              )}
              {contract.status === "active" && (
                <>
                  <Button variant="outline" asChild>
                    <Link
                      href={`/contracts/${contract.id}/inspection/departure`}
                    >
                      <ClipboardCheck className="mr-2 size-4" />
                      {t("viewInspection")}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/contracts/${contract.id}/inspection/return`}>
                      <ClipboardList className="mr-2 size-4" />
                      {t("returnInspection")}
                    </Link>
                  </Button>
                  <Button onClick={() => setValidateReturnOpen(true)}>
                    <Archive className="mr-2 size-4" />
                    {t("validateReturn")}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Archive info card (when completed) */}
      {isCompleted && contract.archivedAt && (
        <Card className="bg-muted border-border">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="size-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {t("archiveInfo")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("archivedAt", {
                  date: formatDateShort(contract.archivedAt),
                })}
              </p>
              {contract.actualReturnDate && (
                <p className="text-sm text-muted-foreground">
                  {t("actualReturnDate", {
                    date: formatDateShort(contract.actualReturnDate),
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3 cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="size-4" />
              {t("clientCard")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold text-foreground">
              {contract.client.firstName} {contract.client.lastName}
            </p>
            {contract.client.isTrusted && (
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <BadgeCheck className="size-3.5" />
                {t("trustedClient")}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {t("phone")}: {contract.client.phone}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("email")}: {contract.client.email}
            </p>
          </CardContent>
        </Card>

        {/* Vehicle card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Car className="size-4" />
              {t("vehicleCard")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold text-foreground">
              {contract.vehicle.brand} {contract.vehicle.model}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("plate")}: {contract.vehicle.plateNumber}
            </p>
            {contract.vehicle.categoryName && (
              <p className="text-sm text-muted-foreground">
                {t("category")}: {contract.vehicle.categoryName}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t("dailyRate")}: {formatCHF(parseFloat(contract.dailyRate))}
            </p>
          </CardContent>
        </Card>

        {/* Dates card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="size-4" />
              {t("datesCard")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t("start")}: {formatDate(contract.startDate)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("end")}: {formatDate(contract.endDate)}
            </p>
            <p className="text-sm font-medium text-foreground">
              {t("totalDays")}: {t("days", { count: contract.totalDays })}
            </p>
            {(contract.pickupLocation || contract.returnLocation) && (
              <div className="pt-1 space-y-0.5">
                {contract.pickupLocation && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {t("pickup")}: {contract.pickupLocation}
                  </p>
                )}
                {contract.returnLocation && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {t("return")}: {contract.returnLocation}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pricing section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("pricingTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">{t("description")}</th>
                  <th className="pb-2 font-medium text-right">
                    {t("unitPrice")}
                  </th>
                  <th className="pb-2 font-medium text-right">{t("total")}</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 text-foreground">{item.description}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {formatCHF(parseFloat(item.unitPrice))}
                    </td>
                    <td className="py-2 text-right font-medium text-foreground">
                      {formatCHF(parseFloat(item.totalPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td
                    colSpan={2}
                    className="pt-3 text-right font-semibold text-foreground"
                  >
                    {t("totalAmount")}
                  </td>
                  <td className="pt-3 text-right font-bold text-foreground">
                    {formatCHF(parseFloat(contract.totalAmount))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("paymentTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("paymentMethod")}</span>
            <span className="font-medium text-foreground">
              {paymentMethodKey
                ? t(`paymentMethods.${paymentMethodKey}`)
                : t("notSpecified")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("deposit")}</span>
            <span className="font-medium text-foreground">
              {contract.depositAmount
                ? formatCHF(parseFloat(contract.depositAmount))
                : t("noDeposit")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {contract.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contract.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invoice section (after approval) */}
      {contract.invoice && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" />
              {t("invoiceTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("invoiceNumber")}</span>
              <span className="font-medium text-foreground">
                {contract.invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("invoiceStatus")}</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  invoiceStatusStyles[contract.invoice.status]
                )}
              >
                {tInvoiceStatus(contract.invoice.status)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("invoiceAmount")}</span>
              <span className="font-medium text-foreground">
                {formatCHF(parseFloat(contract.invoice.totalAmount))}
              </span>
            </div>
            {contract.invoice.issuedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("invoiceDate")}</span>
                <span className="font-medium text-foreground">
                  {formatDateShort(contract.invoice.issuedAt)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validate Return Dialog */}
      {validateReturnOpen && (
        <ValidateReturnDialog
          key={contract.id}
          contractId={contract.id}
          open={validateReturnOpen}
          onOpenChange={setValidateReturnOpen}
        />
      )}
    </div>
  );
}
