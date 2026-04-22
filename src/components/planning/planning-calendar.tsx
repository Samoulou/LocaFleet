"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  FileText,
} from "lucide-react";
import { formatDate, cn, toDateInputValue, parseDateInputValue } from "@/lib/utils";
import { getPlanningData } from "@/actions/planning";
import type { PlanningData } from "@/actions/planning";

type PlanningCalendarProps = {
  initialData: PlanningData;
};

const DAYS_TO_SHOW = 14;

export function PlanningCalendar({ initialData }: PlanningCalendarProps) {
  const t = useTranslations("planning");
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState(() => {
    const d = parseDateInputValue(initialData.startDate);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [data, setData] = useState<PlanningData>(initialData);

  // Re-fetch when date range changes
  useEffect(() => {
    const startStr = toDateInputValue(startDate);
    const endObj = new Date(startDate);
    endObj.setDate(endObj.getDate() + DAYS_TO_SHOW - 1);
    const endStr = toDateInputValue(endObj);

    // Skip fetch if this matches the currently loaded range
    if (startStr === data.startDate && endStr === data.endDate) return;

    startTransition(async () => {
      const result = await getPlanningData(startStr, endStr);
      if (result.success) {
        setData(result.data);
      }
    });
  }, [startDate, data.startDate, data.endDate]);

  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, [startDate]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  function shiftDays(direction: number) {
    setStartDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + direction * DAYS_TO_SHOW);
      return d;
    });
  }

  function isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-400",
    approved: "bg-blue-500",
    pending_cg: "bg-purple-500",
    active: "bg-green-500",
    completed: "bg-slate-400",
    cancelled: "bg-red-400",
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <CalendarIcon className="size-5" />
            {t("title")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftDays(-1)}
              disabled={isPending}
              aria-label={t("previous")}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftDays(1)}
              disabled={isPending}
              aria-label={t("next")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatDate(days[0])} — {formatDate(days[days.length - 1])}
          </span>
          {isPending && (
            <Skeleton className="h-4 w-16" />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header row with dates */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `200px repeat(${DAYS_TO_SHOW}, 1fr)`,
              }}
            >
              <div className="sticky left-0 border-b border-r bg-background p-3 text-sm font-medium text-muted-foreground">
                {t("vehicle")}
              </div>
              {days.map((day, i) => {
                const isToday = isSameDay(day, today);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={cn(
                      "border-b border-r p-2 text-center text-xs",
                      isToday && "bg-primary/5",
                      isWeekend && "bg-muted/30"
                    )}
                  >
                    <div
                      className={cn(
                        "font-medium",
                        isToday && "text-primary"
                      )}
                    >
                      {day.toLocaleDateString("fr-FR", {
                        weekday: "short",
                      })}
                    </div>
                    <div className={cn(isToday && "font-bold text-primary")}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Loading skeleton for rows */}
            {isPending && (
              <div
                className="grid border-b"
                style={{
                  gridTemplateColumns: `200px repeat(${DAYS_TO_SHOW}, 1fr)`,
                }}
              >
                <div className="sticky left-0 border-r bg-background p-3">
                  <Skeleton className="h-4 w-32" />
                </div>
                {Array.from({ length: DAYS_TO_SHOW }).map((_, i) => (
                  <div key={i} className="min-h-[64px] border-r p-1">
                    <Skeleton className="h-6 w-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Vehicle rows */}
            {!isPending &&
              data.vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="grid border-b last:border-b-0"
                  style={{
                    gridTemplateColumns: `200px repeat(${DAYS_TO_SHOW}, 1fr)`,
                  }}
                >
                  {/* Vehicle info cell */}
                  <div className="sticky left-0 flex flex-col justify-center border-r bg-background p-3">
                    <Link
                      href={`/vehicles/${vehicle.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary"
                    >
                      {vehicle.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {vehicle.plateNumber}
                      </Badge>
                      {vehicle.status === "rented" && (
                        <span className="inline-block size-2 rounded-full bg-green-500" />
                      )}
                      {vehicle.status === "maintenance" && (
                        <span className="inline-block size-2 rounded-full bg-amber-500" />
                      )}
                    </div>
                  </div>

                  {/* Day cells */}
                  {days.map((day, dayIdx) => {
                    const dayStart = new Date(day);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(day);
                    dayEnd.setHours(23, 59, 59, 999);

                    const contractsOnDay = vehicle.contracts.filter((c) => {
                      const cStart = new Date(c.startDate);
                      const cEnd = new Date(c.endDate);
                      return cStart <= dayEnd && cEnd >= dayStart;
                    });

                    const isToday = isSameDay(day, today);
                    const isWeekend =
                      day.getDay() === 0 || day.getDay() === 6;

                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          "relative min-h-[64px] border-r p-1",
                          isToday && "bg-primary/5",
                          isWeekend && "bg-muted/30"
                        )}
                      >
                        {contractsOnDay.map((contract) => (
                          <Link
                            key={contract.id}
                            href={`/contracts/${contract.id}`}
                            className={cn(
                              "mb-1 block truncate rounded px-2 py-1 text-[10px] font-medium text-white transition-opacity hover:opacity-90",
                              statusColors[contract.status] ?? "bg-gray-400"
                            )}
                            title={`${contract.contractNumber} — ${contract.clientName}`}
                          >
                            <span className="flex items-center gap-1">
                              <FileText className="size-3 shrink-0" />
                              {contract.contractNumber}
                            </span>
                          </Link>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}

            {!isPending && data.vehicles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarIcon className="mb-2 size-8 opacity-50" />
                <p className="text-sm">{t("noVehicles")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 border-t p-4">
          <span className="text-xs font-medium text-muted-foreground">
            {t("legend")}:
          </span>
          {[
            { key: "draft", label: t("status.draft") },
            { key: "approved", label: t("status.approved") },
            { key: "pending_cg", label: t("status.pending_cg") },
            { key: "active", label: t("status.active") },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block size-3 rounded-sm",
                  statusColors[item.key]
                )}
              />
              <span className="text-xs text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
