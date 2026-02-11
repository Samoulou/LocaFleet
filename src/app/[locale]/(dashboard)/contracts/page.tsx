import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ContractsDataTable } from "@/components/contracts/contracts-data-table";
import { listContracts } from "@/actions/contracts";

type ContractsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContractsPage({
  searchParams,
}: ContractsPageProps) {
  const params = await searchParams;

  const [t, result] = await Promise.all([
    getTranslations("contracts"),
    listContracts({
      page: params.page,
      pageSize: params.pageSize,
      status: params.status,
      search: params.search,
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("list.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("list.subtitle")}</p>
      </div>

      {/* Content */}
      {!result.success ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{result.error}</p>
        </div>
      ) : result.data.totalCount === 0 && !params.search && !params.status ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
            <FileText className="size-6 text-slate-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-slate-900">
            {t("list.empty")}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {t("list.emptyDescription")}
          </p>
        </div>
      ) : (
        <ContractsDataTable data={result.data} />
      )}
    </div>
  );
}
