import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VehicleStatus } from "@/types";

export const STATUS_CONFIG: Record<
  VehicleStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  available: {
    label: "Disponible",
    dotClass: "bg-green-500",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
  },
  rented: {
    label: "Loué",
    dotClass: "bg-violet-500",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
  maintenance: {
    label: "Maintenance",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  out_of_service: {
    label: "Hors service",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant="outline" className={cn("gap-1.5", config.badgeClass)}>
      <span className={cn("size-2 rounded-full", config.dotClass)} />
      {config.label}
    </Badge>
  );
}
