import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getQuoteById } from "@/actions/quotes";
import { getFonctionsForEventForm } from "@/actions/events";
import { QuoteForm } from "@/components/quotes/quote-form";

type EditQuotePageProps = {
  params: Promise<{ id: string; locale: string }>;
};

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  const { id, locale } = await params;

  const [t, quoteResult, fonctionsResult] = await Promise.all([
    getTranslations("quotes"),
    getQuoteById(id),
    getFonctionsForEventForm(),
  ]);

  if (!quoteResult.success) {
    notFound();
  }

  // Only drafts are editable — snapshots stay immutable
  if (quoteResult.data.status !== "draft") {
    redirect({ href: `/quotes/${id}`, locale });
  }

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
          {t("form.editPageTitle")} — {quoteResult.data.quoteNumber}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("form.editPageSubtitle")}
        </p>
      </div>

      <QuoteForm fonctions={fonctionsResult.data} quote={quoteResult.data} />
    </div>
  );
}
