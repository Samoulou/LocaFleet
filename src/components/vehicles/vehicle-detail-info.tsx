import { useTranslations } from "next-intl";
import { formatMileage, formatCHF, formatDate } from "@/lib/utils";
import type { VehicleDetailFull } from "@/actions/vehicles";

type VehicleDetailInfoProps = {
  vehicle: VehicleDetailFull;
};

export function VehicleDetailInfo({ vehicle }: VehicleDetailInfoProps) {
  const t = useTranslations("vehicles.detail");

  const fuelTypeLabel = vehicle.fuelType
    ? t(`fuelTypes.${vehicle.fuelType}`)
    : null;
  const transmissionLabel = vehicle.transmission
    ? t(`transmissions.${vehicle.transmission}`)
    : null;

  const rows: Array<{ label: string; value: string | null }> = [
    { label: t("category"), value: vehicle.categoryName },
    { label: t("year"), value: vehicle.year?.toString() ?? null },
    { label: t("color"), value: vehicle.color },
    { label: t("fuelType"), value: fuelTypeLabel },
    { label: t("transmission"), value: transmissionLabel },
    {
      label: t("seats"),
      value: vehicle.seats?.toString() ?? null,
    },
    { label: t("mileage"), value: formatMileage(vehicle.mileage) },
    { label: t("vin"), value: vehicle.vin },
    {
      label: t("dailyRate"),
      value: vehicle.dailyRateOverride
        ? formatCHF(Number(vehicle.dailyRateOverride))
        : null,
    },
    {
      label: t("weeklyRate"),
      value: vehicle.weeklyRateOverride
        ? formatCHF(Number(vehicle.weeklyRateOverride))
        : null,
    },
    { label: t("createdAt"), value: formatDate(vehicle.createdAt) },
    { label: t("updatedAt"), value: formatDate(vehicle.updatedAt) },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        {t("vehicleInfo")}
      </h2>
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <dt className="text-sm text-slate-500">{row.label}</dt>
            <dd className="text-right text-sm font-medium text-slate-900">
              {row.value ?? (
                <span className="text-slate-400">{t("notSpecified")}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {vehicle.notes && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h3 className="mb-2 text-sm font-medium text-slate-500">
            {t("notes")}
          </h3>
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {vehicle.notes}
          </p>
        </div>
      )}
    </div>
  );
}
