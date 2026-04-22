"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ReturnDue } from "@/actions/dashboard";

type ReturnsDueListProps = {
  returns: ReturnDue[];
};

export function ReturnsDueList({ returns }: ReturnsDueListProps) {
  const t = useTranslations("dashboard.returnsDue");

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contracts">
            {t("viewAll")}
            <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="mb-2 size-8 opacity-50" />
            <p className="text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {returns.map((ret) => (
              <Link
                key={ret.id}
                href={`/contracts/${ret.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {ret.contractNumber}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {ret.plateNumber}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {ret.clientName} — {ret.vehicleName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("returnDate")}: {formatDate(ret.endDate)}
                  </p>
                </div>
                <div className="ml-4 shrink-0">
                  {ret.isOverdue ? (
                    <Badge variant="destructive" className="text-xs">
                      {t("overdue", { days: ret.daysOverdue })}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {t("today")}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
