import { useTranslations } from "next-intl";
import { Wrench } from "lucide-react";
import { cn, formatDate, formatCHF } from "@/lib/utils";
import { CloseMaintenanceDialog } from "@/components/maintenance/close-maintenance-dialog";
import type { VehicleMaintenanceHistoryItem } from "@/actions/vehicles";

type VehicleMaintenanceHistoryProps = {
  records: VehicleMaintenanceHistoryItem[];
  canEdit: boolean;
};

const maintenanceStatusStyles: Record<
  VehicleMaintenanceHistoryItem["status"],
  string
> = {
  open: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
};

export function VehicleMaintenanceHistory({
  records,
  canEdit,
}: VehicleMaintenanceHistoryProps) {
  const t = useTranslations("vehicles.detail.maintenanceHistory");

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
          <Wrench className="size-6 text-slate-400" />
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
              {t("type")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("description")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("startDate")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("endDate")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("estimatedCost")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("finalCost")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("status")}
            </th>
            {canEdit && (
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("actions")}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                {t(`types.${record.type}`)}
              </td>
              <td
                className="max-w-[200px] truncate px-4 py-3 text-sm text-slate-700"
                title={record.description}
              >
                {record.description}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                {formatDate(record.startDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                {record.endDate ? formatDate(record.endDate) : "\u2014"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">
                {record.estimatedCost
                  ? formatCHF(Number(record.estimatedCost))
                  : "\u2014"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900">
                {record.finalCost
                  ? formatCHF(Number(record.finalCost))
                  : "\u2014"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    maintenanceStatusStyles[record.status]
                  )}
                >
                  {t(`statuses.${record.status}`)}
                </span>
              </td>
              {canEdit && (
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {record.status !== "completed" ? (
                    <CloseMaintenanceDialog maintenanceId={record.id} />
                  ) : (
                    <span className="text-sm text-slate-400">{"\u2014"}</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
