import { Tags } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { listCategoriesWithCount } from "@/actions/categories";
import { CategoriesTable } from "@/components/categories/categories-table";
import { CategoryDialog } from "@/components/categories/category-dialog";

export default async function CategoriesPage() {
  const [t, result] = await Promise.all([
    getTranslations("settings.categories"),
    listCategoriesWithCount(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <CategoryDialog />
      </div>

      {/* Content */}
      {!result.success ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{result.error}</p>
        </div>
      ) : result.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
            <Tags className="size-6 text-slate-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-slate-900">
            {t("emptyState.title")}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {t("emptyState.description")}
          </p>
          <div className="mt-4">
            <CategoryDialog />
          </div>
        </div>
      ) : (
        <CategoriesTable categories={result.data} />
      )}
    </div>
  );
}
