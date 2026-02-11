import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ContractDetail } from "@/components/contracts/contract-detail";
import { getContractById } from "@/actions/get-contract";

type ContractDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContractDetailPage({
  params,
}: ContractDetailPageProps) {
  const { id } = await params;

  const [t, result] = await Promise.all([
    getTranslations("contracts"),
    getContractById(id),
  ]);

  if (!result.success) {
    notFound();
  }

  const contract = result.data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/vehicles" className="hover:text-slate-700">
          {t("detail.backToContracts")}
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-slate-900">
          {contract.contractNumber}
        </span>
      </nav>

      {/* Contract detail (client component) */}
      <ContractDetail contract={contract} />
    </div>
  );
}
