"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { getEntityAuditLogs, type AuditLogEntry } from "@/actions/audit-logs";
import { Skeleton } from "@/components/ui/skeleton";
import type { VehicleStatus } from "@/types";

type VehicleActivityLogProps = {
  vehicleId: string;
};

export function VehicleActivityLog({ vehicleId }: VehicleActivityLogProps) {
  const t = useTranslations("vehicles.activityLog");
  const tStatus = useTranslations("vehicles.status");
  const locale = useLocale();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const result = await getEntityAuditLogs("vehicle", vehicleId);
      if (result.success) {
        setLogs(result.data);
      }
      setLoading(false);
    }
    fetchLogs();
  }, [vehicleId]);

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString(
      locale === "fr" ? "fr-CH" : "en-CH",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function getStatusLabel(status: string): string {
    const validStatuses: VehicleStatus[] = [
      "available",
      "rented",
      "maintenance",
      "out_of_service",
    ];
    if (validStatuses.includes(status as VehicleStatus)) {
      return tStatus(status as VehicleStatus);
    }
    return status;
  }

  function getDescription(log: AuditLogEntry): string {
    if (log.action === "status_change") {
      const changes = log.changes as {
        from?: string;
        to?: string;
      } | null;
      if (changes?.from && changes?.to) {
        return t("statusChange", {
          from: getStatusLabel(changes.from),
          to: getStatusLabel(changes.to),
        });
      }
    }
    return log.action;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{t("title")}</h2>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{t("title")}</h2>

      {logs.length === 0 ? (
        <p className="text-sm text-slate-500">{t("empty")}</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const metadata = log.metadata as { reason?: string } | null;
            return (
              <div key={log.id} className="flex gap-3 rounded-lg border p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Clock className="size-4 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900">
                    {getDescription(log)}
                  </p>
                  {metadata?.reason && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t("reason")}: {metadata.reason}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(log.createdAt)}
                    {log.userName && (
                      <>
                        {" "}
                        {t("by")} {log.userName}
                      </>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
