import { notFound } from "next/navigation";
import { Pencil, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { VehicleSummaryCards } from "@/components/vehicles/vehicle-summary-cards";
import { VehicleDetailTabs } from "@/components/vehicles/vehicle-detail-tabs";
import { ChangeStatusDialog } from "@/components/vehicles/change-status-dialog";
import { NewContractSheet } from "@/components/contracts/new-contract-sheet";
import {
  getVehicleWithPhotos,
  getVehicleRentalHistory,
  getVehicleMaintenanceHistory,
} from "@/actions/vehicles";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

type VehicleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VehicleDetailPage({
  params,
}: VehicleDetailPageProps) {
  const { id } = await params;

  const [t, vehicleResult, currentUser] = await Promise.all([
    getTranslations("vehicles"),
    getVehicleWithPhotos(id),
    getCurrentUser(),
  ]);

  if (!vehicleResult.success) {
    notFound();
  }

  const vehicle = vehicleResult.data;
  const canEdit =
    !!currentUser && hasPermission(currentUser.role, "vehicles", "update");
  const canCreateContract =
    !!currentUser &&
    hasPermission(currentUser.role, "contracts", "create") &&
    vehicle.status !== "out_of_service";

  const effectiveDailyRate =
    vehicle.dailyRateOverride ?? vehicle.categoryDailyRate;

  // Fetch rental and maintenance history in parallel
  const [rentalResult, maintenanceResult] = await Promise.all([
    getVehicleRentalHistory(id),
    getVehicleMaintenanceHistory(id),
  ]);

  const rentalHistory = rentalResult.success ? rentalResult.data : [];
  const maintenanceHistory = maintenanceResult.success
    ? maintenanceResult.data
    : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/vehicles" className="hover:text-slate-700">
          {t("title")}
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-slate-900">
          {vehicle.brand} {vehicle.model}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {vehicle.brand} {vehicle.model}
            </h1>
            <VehicleStatusBadge status={vehicle.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{vehicle.plateNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateContract && (
            <NewContractSheet
              vehicleId={vehicle.id}
              vehicleBrand={vehicle.brand}
              vehicleModel={vehicle.model}
              vehiclePlateNumber={vehicle.plateNumber}
              vehicleStatus={vehicle.status}
              dailyRate={
                effectiveDailyRate ? parseFloat(effectiveDailyRate) : 0
              }
              categoryName={vehicle.categoryName}
            />
          )}
          {canEdit && (
            <>
              <ChangeStatusDialog
                vehicleId={vehicle.id}
                currentStatus={vehicle.status}
              />
              <Button asChild>
                <Link href={`/vehicles/${vehicle.id}/edit`}>
                  <Pencil className="mr-2 size-4" />
                  {t("detail.edit")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <VehicleSummaryCards vehicle={vehicle} />

      {/* Tabs */}
      <VehicleDetailTabs
        vehicle={vehicle}
        rentalHistory={rentalHistory}
        maintenanceHistory={maintenanceHistory}
        canEdit={canEdit}
        tenantId={currentUser?.tenantId ?? ""}
      />
    </div>
  );
}
