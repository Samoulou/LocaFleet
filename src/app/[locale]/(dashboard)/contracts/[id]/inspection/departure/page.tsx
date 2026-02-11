import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getContractById } from "@/actions/get-contract";
import { getDepartureInspection } from "@/actions/inspections";
import { getCurrentUser } from "@/lib/auth";
import { DepartureInspectionForm } from "@/components/inspections/departure-inspection-form";

type DepartureInspectionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DepartureInspectionPage({
  params,
}: DepartureInspectionPageProps) {
  const { id } = await params;

  const [t, contractResult, currentUser] = await Promise.all([
    getTranslations("inspections"),
    getContractById(id),
    getCurrentUser(),
  ]);

  if (!contractResult.success || !currentUser) {
    notFound();
  }

  const contract = contractResult.data;

  // Fetch existing inspection
  const inspectionResult = await getDepartureInspection(id);
  const existingInspection = inspectionResult.success
    ? inspectionResult.data
    : null;

  // Determine mode: create (approved/pending_cg) or edit (active with existing inspection)
  const isCreate =
    (contract.status === "approved" || contract.status === "pending_cg") &&
    !existingInspection;
  const isDraftCreate =
    (contract.status === "approved" || contract.status === "pending_cg") &&
    existingInspection?.isDraft;
  const isEdit =
    contract.status === "active" &&
    existingInspection &&
    !existingInspection.isDraft;

  // Guard: only allow valid modes
  if (!isCreate && !isDraftCreate && !isEdit) {
    redirect(`/contracts/${id}`);
  }

  const isEditMode = !!isEdit;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/contracts" className="hover:text-slate-700">
          {t("breadcrumb.contracts")}
        </Link>
        <ChevronRight className="size-4" />
        <Link href={`/contracts/${id}`} className="hover:text-slate-700">
          {contract.contractNumber}
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-slate-900">
          {isEditMode ? t("departure.editTitle") : t("departure.createTitle")}
        </span>
      </nav>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEditMode ? t("departure.editTitle") : t("departure.createTitle")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEditMode
            ? t("departure.editDescription")
            : t("departure.createDescription")}
        </p>
      </div>

      {/* Form */}
      <DepartureInspectionForm
        contract={contract}
        existingInspection={
          existingInspection && !existingInspection.isDraft
            ? existingInspection
            : isDraftCreate
              ? existingInspection
              : null
        }
        isEditMode={isEditMode}
        tenantId={currentUser.tenantId}
      />
    </div>
  );
}
