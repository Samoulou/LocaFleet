import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ClientDetailContent } from "@/components/clients/client-detail-content";
import {
  getClient,
  getClientDocuments,
  getClientContracts,
} from "@/actions/clients";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations("clients");

  const clientResult = await getClient(id);

  if (!clientResult.success) {
    notFound();
  }

  const client = clientResult.data;

  const [docsResult, contractsResult] = await Promise.all([
    getClientDocuments(id),
    getClientContracts(id),
  ]);

  const documents = docsResult.success ? docsResult.data : [];
  const contracts = contractsResult.success ? contractsResult.data : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/clients" className="hover:text-slate-700">
          {t("title")}
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-slate-900">
          {client.firstName} {client.lastName}
        </span>
      </nav>

      {/* Client detail content (client component) */}
      <ClientDetailContent
        client={client}
        documents={documents}
        contracts={contracts}
      />
    </div>
  );
}
