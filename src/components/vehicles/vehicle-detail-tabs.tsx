"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleDetailInfo } from "@/components/vehicles/vehicle-detail-info";
import { VehiclePhotoGallery } from "@/components/vehicles/vehicle-photo-gallery";
import { VehicleActivityLog } from "@/components/vehicles/vehicle-activity-log";
import { VehicleRentalHistory } from "@/components/vehicles/vehicle-rental-history";
import { VehicleMaintenanceHistory } from "@/components/vehicles/vehicle-maintenance-history";
import { CreateMaintenanceDialog } from "@/components/maintenance/create-maintenance-dialog";
import type {
  VehicleDetailFull,
  VehicleRentalHistoryItem,
  VehicleMaintenanceHistoryItem,
} from "@/actions/vehicles";

type VehicleDetailTabsProps = {
  vehicle: VehicleDetailFull;
  rentalHistory: VehicleRentalHistoryItem[];
  maintenanceHistory: VehicleMaintenanceHistoryItem[];
  canEdit: boolean;
  tenantId: string;
};

export function VehicleDetailTabs({
  vehicle,
  rentalHistory,
  maintenanceHistory,
  canEdit,
  tenantId,
}: VehicleDetailTabsProps) {
  const t = useTranslations("vehicles.detail.tabs");

  return (
    <Tabs defaultValue="informations" className="w-full">
      <TabsList>
        <TabsTrigger value="informations">{t("informations")}</TabsTrigger>
        <TabsTrigger value="photos">{t("photos")}</TabsTrigger>
        <TabsTrigger value="locations">{t("locations")}</TabsTrigger>
        <TabsTrigger value="maintenance">{t("maintenance")}</TabsTrigger>
      </TabsList>

      <TabsContent value="informations" className="mt-6 space-y-6">
        <VehicleDetailInfo vehicle={vehicle} />
        <VehicleActivityLog vehicleId={vehicle.id} />
      </TabsContent>

      <TabsContent value="photos" className="mt-6">
        <VehiclePhotoGallery
          vehicleId={vehicle.id}
          tenantId={tenantId}
          initialPhotos={vehicle.photos}
          canEdit={canEdit}
        />
      </TabsContent>

      <TabsContent value="locations" className="mt-6">
        <div className="rounded-xl border border-slate-200 bg-white">
          <VehicleRentalHistory rentals={rentalHistory} />
        </div>
      </TabsContent>

      <TabsContent value="maintenance" className="mt-6 space-y-4">
        {canEdit && (
          <div className="flex justify-end">
            <CreateMaintenanceDialog vehicleId={vehicle.id} />
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white">
          <VehicleMaintenanceHistory records={maintenanceHistory} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
