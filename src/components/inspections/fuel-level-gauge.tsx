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
      <span className="text-sm font-medium text-foreground">
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
                    ? "border-red-500/30 bg-red-500/10 text-red-500"
                    : i === 2
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted",
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
