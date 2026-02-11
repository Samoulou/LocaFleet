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
    cardClass: "border-slate-200 bg-white",
    iconClass: "text-slate-500 bg-slate-100",
    valueClass: "text-slate-900",
  },
  {
    key: "available" as const,
    label: "Disponibles",
    icon: CircleCheck,
    cardClass: "border-green-200 bg-green-50",
    iconClass: "text-green-600 bg-green-100",
    valueClass: "text-green-700",
  },
  {
    key: "rented" as const,
    label: "En location",
    icon: KeyRound,
    cardClass: "border-violet-200 bg-violet-50",
    iconClass: "text-violet-600 bg-violet-100",
    valueClass: "text-violet-700",
  },
  {
    key: "maintenance" as const,
    label: "En maintenance",
    icon: Wrench,
    cardClass: "border-amber-200 bg-amber-50",
    iconClass: "text-amber-600 bg-amber-100",
    valueClass: "text-amber-700",
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
