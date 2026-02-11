import { Receipt } from "lucide-react";
import { InvoiceStatusTabs } from "@/components/invoices/invoice-status-tabs";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { InvoicesDataTable } from "@/components/invoices/invoices-data-table";
import { listInvoices, getInvoiceStatusCounts } from "@/actions/invoices";

type InvoicesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const params = await searchParams;

  const input = {
    page: params.page,
    pageSize: params.pageSize,
    status: params.status,
    search: params.search,
    period: params.period,
  };

  const [invoicesResult, countsResult] = await Promise.all([
    listInvoices(input),
    getInvoiceStatusCounts(),
  ]);

  const counts = countsResult.success ? countsResult.data : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Factures</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consultez et gérez les factures de location
        </p>
      </div>

      {/* Status Tabs */}
      <InvoiceStatusTabs counts={counts} />

      {/* Filters */}
      <InvoiceFilters />

      {/* Content */}
      {!invoicesResult.success ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{invoicesResult.error}</p>
        </div>
      ) : invoicesResult.data.totalCount === 0 &&
        !params.search &&
        !params.status &&
        !params.period ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
            <Receipt className="size-6 text-slate-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-slate-900">
            Aucune facture
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Les factures seront générées automatiquement à la clôture des
            contrats
          </p>
        </div>
      ) : (
        <InvoicesDataTable data={invoicesResult.data} />
      )}
    </div>
  );
}
