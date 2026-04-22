import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { cn, formatDate, formatCHF } from "@/lib/utils";
import type { VehicleRentalHistoryItem } from "@/actions/vehicles";

type VehicleRentalHistoryProps = {
  rentals: VehicleRentalHistoryItem[];
};

const contractStatusStyles: Record<VehicleRentalHistoryItem["status"], string> =
  {
    draft: "bg-muted text-muted-foreground",
    approved: "bg-primary/10 text-primary",
    pending_cg: "bg-amber-500/10 text-amber-500",
    active: "bg-green-500/10 text-green-500",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-red-500/10 text-red-500",
  };

export function VehicleRentalHistory({ rentals }: VehicleRentalHistoryProps) {
  const t = useTranslations("vehicles.detail.rentalHistory");

  if (rentals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <FileText className="size-6 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("contractNumber")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("client")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("startDate")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("endDate")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("amount")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("status")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rentals.map((rental) => (
            <tr key={rental.id} className="hover:bg-muted">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                {rental.contractNumber}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                {rental.clientFirstName} {rental.clientLastName}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                {formatDate(rental.startDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                {rental.actualReturnDate
                  ? formatDate(rental.actualReturnDate)
                  : formatDate(rental.endDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-foreground">
                {formatCHF(Number(rental.totalAmount))}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    contractStatusStyles[rental.status]
                  )}
                >
                  {t(`statuses.${rental.status}`)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
