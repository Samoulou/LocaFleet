import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getContractById } from "@/actions/get-contract";
import {
  getDepartureInspection,
  getReturnInspection,
} from "@/actions/inspections";
import { getCurrentUser } from "@/lib/auth";
import { ReturnInspectionForm } from "@/components/inspections/return-inspection-form";

type ReturnInspectionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReturnInspectionPage({
  params,
}: ReturnInspectionPageProps) {
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

  // Guard: contract must be active for return inspection
  if (contract.status !== "active") {
    redirect(`/contracts/${id}`);
  }

  // Fetch departure inspection (for departure mileage and damages)
  const departureResult = await getDepartureInspection(id);
  if (!departureResult.success || !departureResult.data) {
    // No departure inspection means something is wrong
    redirect(`/contracts/${id}`);
  }

  const departureInspection = departureResult.data;

  // Fetch existing return inspection (if editing)
  const returnResult = await getReturnInspection(id);
  const existingInspection = returnResult.success ? returnResult.data : null;

  const isEditMode = !!existingInspection && !existingInspection.isDraft;

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
          {isEditMode ? t("return.editTitle") : t("return.createTitle")}
        </span>
      </nav>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEditMode ? t("return.editTitle") : t("return.createTitle")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEditMode
            ? t("return.editDescription")
            : t("return.createDescription")}
        </p>
      </div>

      {/* Form */}
      <ReturnInspectionForm
        contract={contract}
        existingInspection={
          existingInspection && !existingInspection.isDraft
            ? existingInspection
            : existingInspection?.isDraft
              ? existingInspection
              : null
        }
        isEditMode={isEditMode}
        tenantId={currentUser.tenantId}
        departureMileage={departureInspection.mileage}
        departureDamages={departureInspection.damages}
      />
    </div>
  );
}
