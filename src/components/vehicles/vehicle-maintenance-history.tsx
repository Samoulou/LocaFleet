import { useState } from "react";
import { useTranslations } from "next-intl";
import { Wrench, XCircle } from "lucide-react";
import { cn, formatDate, formatCHF } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CloseMaintenanceDialog } from "@/components/maintenance/close-maintenance-dialog";
import { CancelMaintenanceDialog } from "@/components/maintenance/cancel-maintenance-dialog";
import type { VehicleMaintenanceHistoryItem } from "@/actions/vehicles";

type VehicleMaintenanceHistoryProps = {
  records: VehicleMaintenanceHistoryItem[];
  canEdit: boolean;
};

const maintenanceStatusStyles: Record<
  VehicleMaintenanceHistoryItem["status"],
  string
> = {
  open: "bg-amber-500/10 text-amber-500",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
};

export function VehicleMaintenanceHistory({
  records,
  canEdit,
}: VehicleMaintenanceHistoryProps) {
  const t = useTranslations("vehicles.detail.maintenanceHistory");

  const [cancelId, setCancelId] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Wrench className="size-6 text-muted-foreground" />
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
              {t("type")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("description")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("startDate")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("endDate")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("estimatedCost")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("finalCost")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("status")}
            </th>
            {canEdit && (
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("actions")}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-muted">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                {t(`types.${record.type}`)}
              </td>
              <td
                className="max-w-[200px] truncate px-4 py-3 text-sm text-foreground"
                title={record.description}
              >
                {record.description}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                {formatDate(record.startDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                {record.endDate ? formatDate(record.endDate) : "\u2014"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-foreground">
                {record.estimatedCost
                  ? formatCHF(Number(record.estimatedCost))
                  : "\u2014"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-foreground">
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
                  <div className="flex items-center justify-end gap-1">
                    {record.status !== "completed" && record.status !== "cancelled" ? (
                      <>
                        <CloseMaintenanceDialog maintenanceId={record.id} />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setCancelId(record.id)}
                        >
                          <XCircle className="mr-1 size-3.5" />
                          {t("cancel")}
                        </Button>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {"\u2014"}
                      </span>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <CancelMaintenanceDialog
        maintenanceId={cancelId ?? ""}
        open={!!cancelId}
        onOpenChange={(open) => {
          if (!open) setCancelId(null);
        }}
      />
    </div>
  );
}
