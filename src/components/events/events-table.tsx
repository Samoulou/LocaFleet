"use client";

import { useTranslations } from "next-intl";
import { Car, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { ListEventsResult } from "@/actions/events";
import { formatCHF, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventStatusBadge } from "./event-status-badge";

const ALL_STATUSES = "all";
const STATUSES = [
  "draft",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;

type EventsTableProps = {
  data: ListEventsResult;
};

export function EventsTable({ data }: EventsTableProps) {
  const t = useTranslations("events");
  const tStatus = useTranslations("events.status");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? ALL_STATUSES;
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function navigate(params: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={currentStatus}
          onValueChange={(value) =>
            navigate({
              status: value === ALL_STATUSES ? undefined : value,
              page: undefined,
            })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>
              {t("list.allStatuses")}
            </SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {tStatus(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.number")}</TableHead>
              <TableHead>{t("columns.title")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("columns.fonction")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("columns.client")}
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("columns.period")}
              </TableHead>
              <TableHead className="text-center hidden md:table-cell">
                {t("columns.resources")}
              </TableHead>
              <TableHead className="text-right hidden lg:table-cell">
                {t("columns.amount")}
              </TableHead>
              <TableHead>{t("columns.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/events/${event.id}`}
                    className="text-primary hover:underline"
                  >
                    {event.eventNumber}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[220px] truncate">
                  {event.title}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: event.fonctionColor ?? "#94A3B8",
                      }}
                    />
                    {event.fonctionName}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {event.clientFirstName} {event.clientLastName}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {formatDate(event.startDate)} → {formatDate(event.endDate)}
                </TableCell>
                <TableCell className="text-center hidden md:table-cell">
                  <span className="inline-flex items-center gap-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Car className="size-3.5" />
                      {event.vehicleCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {event.employeeCount}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell">
                  {event.agreedAmount
                    ? formatCHF(parseFloat(event.agreedAmount))
                    : "—"}
                </TableCell>
                <TableCell>
                  <EventStatusBadge status={event.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t("list.total", { count: data.total })}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data.page <= 1}
            onClick={() => navigate({ page: String(data.page - 1) })}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span>
            {data.page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= totalPages}
            onClick={() => navigate({ page: String(data.page + 1) })}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
