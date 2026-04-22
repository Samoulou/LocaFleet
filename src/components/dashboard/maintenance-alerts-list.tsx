"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";
import type { MaintenanceAlert } from "@/actions/dashboard";

type MaintenanceAlertsListProps = {
  alerts: MaintenanceAlert[];
};

export function MaintenanceAlertsList({ alerts }: MaintenanceAlertsListProps) {
  const t = useTranslations("dashboard.maintenance");

  const urgencyColors: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    low: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  };

  const statusLabels: Record<string, string> = {
    open: t("status.open"),
    in_progress: t("status.in_progress"),
    completed: t("status.completed"),
  };

  const typeLabels: Record<string, string> = {
    regular_service: t("type.regular_service"),
    repair: t("type.repair"),
    technical_inspection: t("type.technical_inspection"),
    tires: t("type.tires"),
    other: t("type.other"),
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Wrench className="mb-2 size-8 opacity-50" />
            <p className="text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                href={`/vehicles`}
                className="flex items-start justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {alert.vehicleName}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {alert.plateNumber}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {typeLabels[alert.type] ?? alert.type} — {statusLabels[alert.status] ?? alert.status}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`ml-2 shrink-0 text-[10px] uppercase ${urgencyColors[alert.urgency] ?? ""}`}
                >
                  {alert.urgency}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
