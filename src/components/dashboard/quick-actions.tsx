"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, UserPlus, Car, ClipboardCheck } from "lucide-react";
import { NewContractSheet } from "@/components/contracts/new-contract-sheet";
import { VehiclePickerDialog } from "@/components/dashboard/vehicle-picker-dialog";
import type { VehiclePickerItem } from "@/actions/vehicles";

export function QuickActions() {
  const t = useTranslations("dashboard.quickActions");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePickerItem | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleSelectVehicle(vehicle: VehiclePickerItem) {
    setSelectedVehicle(vehicle);
    setPickerOpen(false);
    setSheetOpen(true);
  }

  function handleSheetOpenChange(isOpen: boolean) {
    setSheetOpen(isOpen);
    if (!isOpen) {
      setSelectedVehicle(null);
    }
  }

  type LinkAction = {
    label: string;
    href: string;
    icon: typeof FileText;
    variant: "default" | "outline";
  };

  type ButtonAction = {
    label: string;
    icon: typeof FileText;
    variant: "default" | "outline";
    onClick: () => void;
  };

  const actions: (LinkAction | ButtonAction)[] = [
    {
      label: t("newContract"),
      icon: FileText,
      variant: "default" as const,
      onClick: () => setPickerOpen(true),
    },
    {
      label: t("newClient"),
      href: "/clients",
      icon: UserPlus,
      variant: "outline" as const,
    },
    {
      label: t("newVehicle"),
      href: "/vehicles/new",
      icon: Car,
      variant: "outline" as const,
    },
    {
      label: t("inspection"),
      href: "/contracts",
      icon: ClipboardCheck,
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) =>
            "href" in action ? (
              <Button
                key={action.label}
                variant={action.variant}
                className="h-auto flex-col gap-2 py-4"
                asChild
              >
                <Link href={action.href}>
                  <action.icon className="size-5" />
                  <span className="text-xs">{action.label}</span>
                </Link>
              </Button>
            ) : (
              <Button
                key={action.label}
                variant={action.variant}
                className="h-auto flex-col gap-2 py-4"
                onClick={action.onClick}
              >
                <action.icon className="size-5" />
                <span className="text-xs">{action.label}</span>
              </Button>
            )
          )}
        </div>
      </CardContent>

      <VehiclePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleSelectVehicle}
      />

      {selectedVehicle && (
        <NewContractSheet
          vehicleId={selectedVehicle.id}
          vehicleBrand={selectedVehicle.brand}
          vehicleModel={selectedVehicle.model}
          vehiclePlateNumber={selectedVehicle.plateNumber}
          vehicleStatus={selectedVehicle.status}
          dailyRate={selectedVehicle.dailyRate}
          categoryName={selectedVehicle.categoryName}
          open={sheetOpen}
          onOpenChange={handleSheetOpenChange}
        />
      )}
    </Card>
  );
}
