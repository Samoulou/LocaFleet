import { getTranslations } from "next-intl/server";
import { getFonctionsForEventForm } from "@/actions/events";
import { QuoteForm } from "@/components/quotes/quote-form";

export default async function NewQuotePage() {
  const [t, fonctionsResult] = await Promise.all([
    getTranslations("quotes"),
    getFonctionsForEventForm(),
  ]);

  if (!fonctionsResult.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{fonctionsResult.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("form.createPageTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("form.createPageSubtitle")}
        </p>
      </div>

      <QuoteForm fonctions={fonctionsResult.data} />
    </div>
  );
}
