import { Receipt, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCHF } from "@/lib/utils";
import type { InvoiceKPIs } from "@/actions/invoices";

type InvoiceKpiCardsProps = {
  kpis: InvoiceKPIs;
};

const KPI_CONFIG = [
  {
    key: "totalPending" as const,
    label: "Montant en attente",
    icon: Receipt,
    cardClass: "border-border bg-card",
    iconClass: "text-muted-foreground bg-muted",
    valueClass: "text-foreground",
    formatter: (v: number) => formatCHF(v),
  },
  {
    key: "totalPaidThisMonth" as const,
    label: "Payé ce mois",
    icon: TrendingUp,
    cardClass: "border-green-500/30 bg-card",
    iconClass: "text-green-500 bg-green-500/10",
    valueClass: "text-green-500",
    formatter: (v: number) => formatCHF(v),
  },
  {
    key: "averageAmount" as const,
    label: "Montant moyen",
    icon: Receipt,
    cardClass: "border-blue-500/30 bg-card",
    iconClass: "text-blue-500 bg-blue-500/10",
    valueClass: "text-blue-500",
    formatter: (v: number) => formatCHF(v),
  },
  {
    key: "overdueCount" as const,
    label: "Factures en retard",
    icon: AlertTriangle,
    cardClass: "border-red-500/30 bg-card",
    iconClass: "text-red-500 bg-red-500/10",
    valueClass: "text-red-500",
    formatter: (v: number) => String(v),
  },
] as const;

export function InvoiceKpiCards({ kpis }: InvoiceKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {KPI_CONFIG.map((config) => {
        const Icon = config.icon;
        const value = kpis[config.key];
        return (
          <div
            key={config.key}
            className={cn("rounded-xl border p-4", config.cardClass)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{config.label}</p>
                <p className={cn("mt-1 text-2xl font-bold", config.valueClass)}>
                  {config.formatter(value)}
                </p>
              </div>
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg",
                  config.iconClass
                )}
              >
                <Icon className="size-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
