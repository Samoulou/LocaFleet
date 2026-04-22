import { Car, CircleCheck, KeyRound, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VehicleKPIs } from "@/actions/vehicles";

type VehicleKpiCardsProps = {
  kpis: VehicleKPIs;
};

const KPI_CONFIG = [
  {
    key: "total" as const,
    label: "Total véhicules",
    icon: Car,
    cardClass: "border-border bg-card",
    iconClass: "text-muted-foreground bg-muted",
    valueClass: "text-foreground",
  },
  {
    key: "available" as const,
    label: "Disponibles",
    icon: CircleCheck,
    cardClass: "border-green-500/30 bg-card",
    iconClass: "text-green-500 bg-green-500/10",
    valueClass: "text-green-500",
  },
  {
    key: "rented" as const,
    label: "En location",
    icon: KeyRound,
    cardClass: "border-violet-500/30 bg-card",
    iconClass: "text-violet-500 bg-violet-500/10",
    valueClass: "text-violet-500",
  },
  {
    key: "maintenance" as const,
    label: "En maintenance",
    icon: Wrench,
    cardClass: "border-amber-500/30 bg-card",
    iconClass: "text-amber-500 bg-amber-500/10",
    valueClass: "text-amber-500",
  },
] as const;

export function VehicleKpiCards({ kpis }: VehicleKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
