"use client";

import { useTranslations } from "next-intl";
import { formatCHF } from "@/lib/utils";

type SelectedOption = {
  name: string;
  dailyPrice: number;
  isPerDay: boolean | null;
};

type ContractPriceSummaryProps = {
  dailyRate: number;
  totalDays: number | null;
  selectedOptions: SelectedOption[];
  totalHours?: number | null;
};

export function ContractPriceSummary({
  dailyRate,
  totalDays,
  selectedOptions,
  totalHours,
}: ContractPriceSummaryProps) {
  const t = useTranslations("contracts.create.summary");

  if (!totalDays || totalDays <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
        {t("selectDates")}
      </div>
    );
  }

  const baseAmount = dailyRate * totalDays;

  const optionLines = selectedOptions.map((opt) => {
    const total = opt.isPerDay ? opt.dailyPrice * totalDays : opt.dailyPrice;
    return { name: opt.name, total };
  });

  const optionsTotal = optionLines.reduce((sum, line) => sum + line.total, 0);
  const totalAmount = baseAmount + optionsTotal;

  const baseLabel =
    totalHours != null
      ? t("baseAmountWithHours", {
          hours: totalHours,
          days: totalDays,
          rate: formatCHF(dailyRate),
        })
      : `${t("baseAmount")} (${totalDays}j × ${formatCHF(dailyRate)})`;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
      <h4 className="text-sm font-semibold text-slate-700">{t("title")}</h4>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">{baseLabel}</span>
          <span className="font-medium">{formatCHF(baseAmount)}</span>
        </div>
        {optionLines.map((line) => (
          <div key={line.name} className="flex justify-between">
            <span className="text-slate-600">{line.name}</span>
            <span className="font-medium">{formatCHF(line.total)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold">
        <span>{t("total")}</span>
        <span>{formatCHF(totalAmount)}</span>
      </div>
    </div>
  );
}
