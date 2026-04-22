"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import { formatDate, formatCHF } from "@/lib/utils";
import type { ActiveRental } from "@/actions/dashboard";

type ActiveRentalsListProps = {
  rentals: ActiveRental[];
};

export function ActiveRentalsList({ rentals }: ActiveRentalsListProps) {
  const t = useTranslations("dashboard.activeRentals");

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
        {rentals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="mb-2 size-8 opacity-50" />
            <p className="text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rentals.map((rental) => (
              <Link
                key={rental.id}
                href={`/contracts/${rental.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {rental.contractNumber}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {rental.plateNumber}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {rental.clientName} — {rental.vehicleName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(rental.startDate)} → {formatDate(rental.endDate)}
                  </p>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCHF(parseFloat(rental.totalAmount))}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
