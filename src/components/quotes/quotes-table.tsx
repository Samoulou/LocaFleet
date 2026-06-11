"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { ListQuotesResult } from "@/actions/quotes";
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
import { QuoteStatusBadge } from "./quote-status-badge";

const ALL_STATUSES = "all";
const STATUSES = ["draft", "sent", "accepted", "declined", "expired"] as const;

type QuotesTableProps = {
  data: ListQuotesResult;
};

export function QuotesTable({ data }: QuotesTableProps) {
  const t = useTranslations("quotes");
  const tStatus = useTranslations("quotes.status");
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
                {t("columns.validUntil")}
              </TableHead>
              <TableHead className="text-right">
                {t("columns.amount")}
              </TableHead>
              <TableHead>{t("columns.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="text-primary hover:underline"
                  >
                    {quote.quoteNumber}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[220px] truncate">
                  {quote.title || "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: quote.fonctionColor ?? "#94A3B8",
                      }}
                    />
                    {quote.fonctionName}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {quote.clientFirstName} {quote.clientLastName}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {quote.validUntil ? formatDate(quote.validUntil) : "—"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCHF(parseFloat(quote.totalAmount))}
                </TableCell>
                <TableCell>
                  <QuoteStatusBadge status={quote.status} />
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
