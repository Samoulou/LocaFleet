import { useTranslations } from "next-intl";
import {
  Car,
  Fuel,
  Settings2,
  Gauge,
  Calendar,
  Users,
  Banknote,
} from "lucide-react";
import { formatMileage, formatCHF } from "@/lib/utils";
import type { VehicleDetailFull } from "@/actions/vehicles";

type VehicleSummaryCardsProps = {
  vehicle: VehicleDetailFull;
};

export function VehicleSummaryCards({ vehicle }: VehicleSummaryCardsProps) {
  const t = useTranslations("vehicles.detail");

  const fuelTypeLabel = vehicle.fuelType
    ? t(`fuelTypes.${vehicle.fuelType}`)
    : null;
  const transmissionLabel = vehicle.transmission
    ? t(`transmissions.${vehicle.transmission}`)
    : null;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Card 1: Category / Fuel / Transmission */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="space-y-3">
          <SummaryRow
            icon={<Car className="size-4 text-slate-400" />}
            label={t("summary.category")}
            value={vehicle.categoryName}
            fallback={t("notSpecified")}
          />
          <SummaryRow
            icon={<Fuel className="size-4 text-slate-400" />}
            label={t("summary.fuelType")}
            value={fuelTypeLabel}
            fallback={t("notSpecified")}
          />
          <SummaryRow
            icon={<Settings2 className="size-4 text-slate-400" />}
            label={t("summary.transmission")}
            value={transmissionLabel}
            fallback={t("notSpecified")}
          />
        </div>
      </div>

      {/* Card 2: Mileage / Year / Seats */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="space-y-3">
          <SummaryRow
            icon={<Gauge className="size-4 text-slate-400" />}
            label={t("summary.mileage")}
            value={formatMileage(vehicle.mileage)}
          />
          <SummaryRow
            icon={<Calendar className="size-4 text-slate-400" />}
            label={t("summary.year")}
            value={vehicle.year?.toString() ?? null}
            fallback={t("notSpecified")}
          />
          <SummaryRow
            icon={<Users className="size-4 text-slate-400" />}
            label={t("summary.seats")}
            value={vehicle.seats?.toString() ?? null}
            fallback={t("notSpecified")}
          />
        </div>
      </div>

      {/* Card 3: Rates */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="space-y-3">
          <SummaryRow
            icon={<Banknote className="size-4 text-slate-400" />}
            label={t("summary.dailyRate")}
            value={
              vehicle.dailyRateOverride
                ? formatCHF(Number(vehicle.dailyRateOverride))
                : null
            }
            fallback="—"
          />
          <SummaryRow
            icon={<Banknote className="size-4 text-slate-400" />}
            label={t("summary.weeklyRate")}
            value={
              vehicle.weeklyRateOverride
                ? formatCHF(Number(vehicle.weeklyRateOverride))
                : null
            }
            fallback="—"
          />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  fallback = "—",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  fallback?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex flex-1 items-center justify-between gap-2">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="text-sm font-medium text-slate-900">
          {value ?? <span className="text-slate-400">{fallback}</span>}
        </span>
      </div>
    </div>
  );
}
