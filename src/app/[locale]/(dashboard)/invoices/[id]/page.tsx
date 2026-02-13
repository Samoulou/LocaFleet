import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getInvoiceById } from "@/actions/invoices";
import { InvoiceDetailContent } from "@/components/invoices/invoice-detail-content";

type InvoiceDetailPageProps = {
  params: Promise<{ id: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const [t, result] = await Promise.all([
    getTranslations("invoices"),
    getInvoiceById(id),
  ]);

  if (!result.success) {
    notFound();
  }

  const invoice = result.data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/invoices" className="hover:text-slate-700">
          {t("breadcrumb.backToList")}
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-slate-900">
          {invoice.invoiceNumber}
        </span>
      </nav>

      {/* Invoice detail (client component) */}
      <InvoiceDetailContent invoice={invoice} />
    </div>
  );
}
