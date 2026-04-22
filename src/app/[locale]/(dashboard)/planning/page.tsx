import { getTranslations } from "next-intl/server";
import { getPlanningData } from "@/actions/planning";
import { PlanningCalendar } from "@/components/planning/planning-calendar";
import { toDateInputValue } from "@/lib/utils";

export default async function PlanningPage() {
  const t = await getTranslations("planning");

  // Default to current week + next week (14 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = toDateInputValue(today);
  const endDateObj = new Date(today);
  endDateObj.setDate(endDateObj.getDate() + 13);
  const endDate = toDateInputValue(endDateObj);

  const result = await getPlanningData(startDate, endDate);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
          {result.error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <PlanningCalendar initialData={result.data} />
    </div>
  );
}
