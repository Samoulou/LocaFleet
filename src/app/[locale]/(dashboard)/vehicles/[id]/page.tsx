import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { VehicleDetailInfo } from "@/components/vehicles/vehicle-detail-info";
import { VehiclePhotoGallery } from "@/components/vehicles/vehicle-photo-gallery";
import { ChangeStatusDialog } from "@/components/vehicles/change-status-dialog";
import { VehicleActivityLog } from "@/components/vehicles/vehicle-activity-log";
import { getVehicleWithPhotos } from "@/actions/vehicles";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/vehicles">
            <ArrowLeft className="mr-1 size-4" />
            {t("detail.back")}
          </Link>
        </Button>
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
          {canEdit && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Photo gallery (2/3) */}
        <div className="lg:col-span-2">
          <VehiclePhotoGallery
            vehicleId={vehicle.id}
            tenantId={currentUser?.tenantId ?? ""}
            initialPhotos={vehicle.photos}
            canEdit={canEdit}
          />
        </div>

        {/* Right: Vehicle info (1/3) */}
        <div>
          <VehicleDetailInfo vehicle={vehicle} />
        </div>
      </div>

      {/* Activity Log */}
      <VehicleActivityLog vehicleId={vehicle.id} />
    </div>
  );
}
