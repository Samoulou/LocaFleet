import { FileText, Pencil, Clock, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContractKPIs } from "@/actions/contracts";

type ContractKpiCardsProps = {
  kpis: ContractKPIs;
};

const KPI_CONFIG = [
  {
    key: "total" as const,
    label: "Total contrats",
    icon: FileText,
    cardClass: "border-border bg-card",
    iconClass: "text-muted-foreground bg-muted",
    valueClass: "text-foreground",
  },
  {
    key: "draft" as const,
    label: "Brouillons",
    icon: Pencil,
    cardClass: "border-slate-500/30 bg-card",
    iconClass: "text-slate-500 bg-slate-500/10",
    valueClass: "text-slate-500",
  },
  {
    key: "approved" as const,
    label: "Approuvés",
    icon: CheckCircle2,
    cardClass: "border-blue-500/30 bg-card",
    iconClass: "text-blue-500 bg-blue-500/10",
    valueClass: "text-blue-500",
  },
  {
    key: "pendingCG" as const,
    label: "En attente CG",
    icon: Clock,
    cardClass: "border-amber-500/30 bg-card",
    iconClass: "text-amber-500 bg-amber-500/10",
    valueClass: "text-amber-500",
  },
  {
    key: "active" as const,
    label: "Actifs",
    icon: KeyRound,
    cardClass: "border-violet-500/30 bg-card",
    iconClass: "text-violet-500 bg-violet-500/10",
    valueClass: "text-violet-500",
  },
  {
    key: "completed" as const,
    label: "Clôturés",
    icon: CheckCircle2,
    cardClass: "border-green-500/30 bg-card",
    iconClass: "text-green-500 bg-green-500/10",
    valueClass: "text-green-500",
  },
  {
    key: "cancelled" as const,
    label: "Annulés",
    icon: XCircle,
    cardClass: "border-red-500/30 bg-card",
    iconClass: "text-red-500 bg-red-500/10",
    valueClass: "text-red-500",
  },
] as const;

export function ContractKpiCards({ kpis }: ContractKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
      {KPI_CONFIG.map((config) => {
        const Icon = config.icon;
        return (
          <div
            key={config.key}
            className={cn("rounded-xl border p-4", config.cardClass)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{config.label}</p>
                <p className={cn("mt-1 text-2xl font-bold", config.valueClass)}>
                  {kpis[config.key]}
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
