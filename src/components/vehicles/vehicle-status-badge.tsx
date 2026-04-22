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
    badgeClass: "bg-green-500/10 text-green-500 border-green-500/30",
  },
  rented: {
    label: "Loué",
    dotClass: "bg-violet-500",
    badgeClass: "bg-violet-500/10 text-violet-500 border-violet-500/30",
  },
  maintenance: {
    label: "Maintenance",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  out_of_service: {
    label: "Hors service",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-500/10 text-red-500 border-red-500/30",
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
