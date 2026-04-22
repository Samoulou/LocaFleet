import { Users, BadgeCheck, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientKPIs } from "@/actions/clients";

type ClientKpiCardsProps = {
  kpis: ClientKPIs;
};

const KPI_CONFIG = [
  {
    key: "totalClients" as const,
    label: "Total clients",
    icon: Users,
    cardClass: "border-border bg-card",
    iconClass: "text-muted-foreground bg-muted",
    valueClass: "text-foreground",
  },
  {
    key: "trustedClients" as const,
    label: "De confiance",
    icon: BadgeCheck,
    cardClass: "border-emerald-500/30 bg-card",
    iconClass: "text-emerald-500 bg-emerald-500/10",
    valueClass: "text-emerald-500",
  },
  {
    key: "activeRentals" as const,
    label: "En location",
    icon: KeyRound,
    cardClass: "border-violet-500/30 bg-card",
    iconClass: "text-violet-500 bg-violet-500/10",
    valueClass: "text-violet-500",
  },
] as const;

export function ClientKpiCards({ kpis }: ClientKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
