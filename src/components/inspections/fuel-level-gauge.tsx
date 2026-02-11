"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const FUEL_LEVELS = [
  { value: "empty", label: "E" },
  { value: "quarter", label: "1/4" },
  { value: "half", label: "1/2" },
  { value: "three_quarter", label: "3/4" },
  { value: "full", label: "F" },
] as const;

type FuelLevelValue = (typeof FUEL_LEVELS)[number]["value"];

type FuelLevelGaugeProps = {
  value: FuelLevelValue;
  onChange: (value: FuelLevelValue) => void;
  disabled?: boolean;
};

export function FuelLevelGauge({
  value,
  onChange,
  disabled,
}: FuelLevelGaugeProps) {
  const t = useTranslations("inspections.departure");
  const activeIndex = FUEL_LEVELS.findIndex((l) => l.value === value);

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700">
        {t("fuelLevel")}
      </span>
      <div className="flex gap-1">
        {FUEL_LEVELS.map((level, i) => {
          const isActive = i <= activeIndex;
          return (
            <button
              key={level.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(level.value)}
              className={cn(
                "flex h-10 flex-1 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                isActive
                  ? i <= 1
                    ? "border-red-300 bg-red-100 text-red-700"
                    : i === 2
                      ? "border-amber-300 bg-amber-100 text-amber-700"
                      : "border-emerald-300 bg-emerald-100 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {level.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
