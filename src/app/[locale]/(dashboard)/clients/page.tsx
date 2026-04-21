import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientsDataTable } from "@/components/clients/clients-data-table";
import { ClientKpiCards } from "@/components/clients/client-kpi-cards";
import { ClientsPageHeader } from "@/components/clients/clients-page-header";
import { listClients, getClientKPIs } from "@/actions/clients";

type ClientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const t = await getTranslations("clients");

  const input = {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
  };

  const [clientsResult, kpisResult] = await Promise.all([
    listClients(input),
    getClientKPIs(),
  ]);

  const kpis = kpisResult.success ? kpisResult.data : null;

  return (
    <div className="space-y-6">
      {/* Header with Sheet-based create */}
      <ClientsPageHeader />

      {/* KPI Cards */}
      {kpis && kpis.totalClients > 0 && <ClientKpiCards kpis={kpis} />}

      {/* Filters */}
      <ClientFilters />

      {/* Content */}
      {!clientsResult.success ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{clientsResult.error}</p>
        </div>
      ) : clientsResult.data.totalCount === 0 && !params.search ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
            <Users className="size-6 text-slate-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-slate-900">
            {t("emptyState.title")}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {t("emptyState.description")}
          </p>
        </div>
      ) : (
        <ClientsDataTable data={clientsResult.data} />
      )}
    </div>
  );
}
