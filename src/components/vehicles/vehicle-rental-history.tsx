import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { cn, formatDate, formatCHF } from "@/lib/utils";
import type { VehicleRentalHistoryItem } from "@/actions/vehicles";

type VehicleRentalHistoryProps = {
  rentals: VehicleRentalHistoryItem[];
};

const contractStatusStyles: Record<VehicleRentalHistoryItem["status"], string> =
  {
    draft: "bg-slate-100 text-slate-600",
    active: "bg-green-50 text-green-700",
    completed: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-50 text-red-700",
  };

export function VehicleRentalHistory({ rentals }: VehicleRentalHistoryProps) {
  const t = useTranslations("vehicles.detail.rentalHistory");

  if (rentals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
          <FileText className="size-6 text-slate-400" />
        </div>
        <p className="mt-3 text-sm text-slate-500">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("contractNumber")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("client")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("startDate")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("endDate")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("amount")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("status")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rentals.map((rental) => (
            <tr key={rental.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                {rental.contractNumber}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                {rental.clientFirstName} {rental.clientLastName}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                {formatDate(rental.startDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                {rental.actualReturnDate
                  ? formatDate(rental.actualReturnDate)
                  : formatDate(rental.endDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900">
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
