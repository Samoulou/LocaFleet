import { getTranslations } from "next-intl/server";
import { getPlanningData } from "@/actions/planning";
import { PlanningCalendar } from "@/components/planning/planning-calendar";
import { toDateInputValue } from "@/lib/utils";

export default async function PlanningPage() {
  const t = await getTranslations("planning");

  // Default to ±30 days (60 days total) for horizontal scroll
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDateObj = new Date(today);
  startDateObj.setDate(startDateObj.getDate() - 30);
  const endDateObj = new Date(today);
  endDateObj.setDate(endDateObj.getDate() + 29);

  const result = await getPlanningData(
    toDateInputValue(startDateObj),
    toDateInputValue(endDateObj)
  );

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
