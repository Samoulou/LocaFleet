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
    cardClass: "border-slate-200 bg-white",
    iconClass: "text-slate-500 bg-slate-100",
    valueClass: "text-slate-900",
  },
  {
    key: "trustedClients" as const,
    label: "De confiance",
    icon: BadgeCheck,
    cardClass: "border-emerald-200 bg-emerald-50",
    iconClass: "text-emerald-600 bg-emerald-100",
    valueClass: "text-emerald-700",
  },
  {
    key: "activeRentals" as const,
    label: "En location",
    icon: KeyRound,
    cardClass: "border-violet-200 bg-violet-50",
    iconClass: "text-violet-600 bg-violet-100",
    valueClass: "text-violet-700",
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
                <p className="text-sm text-slate-500">{config.label}</p>
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
