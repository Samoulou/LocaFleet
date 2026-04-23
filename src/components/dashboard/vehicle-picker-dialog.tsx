"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Car, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { formatCHF } from "@/lib/utils";
import { getVehiclesForContractPicker } from "@/actions/vehicles";
import type { VehiclePickerItem } from "@/actions/vehicles";

type VehiclePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (vehicle: VehiclePickerItem) => void;
};

export function VehiclePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: VehiclePickerDialogProps) {
  const t = useTranslations("dashboard.vehiclePicker");
  const [vehicles, setVehicles] = useState<VehiclePickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    setLoading(true);
    getVehiclesForContractPicker().then((result) => {
      if (result.success) {
        setVehicles(result.data);
      }
      setLoading(false);
    });
  }, [open]);

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.plateNumber.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="size-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {search ? t("noResults") : t("empty")}
            </div>
          ) : (
            filtered.map((vehicle) => (
              <Button
                key={vehicle.id}
                variant="outline"
                className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
                onClick={() => onSelect(vehicle)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {vehicle.brand} {vehicle.model}
                    </p>
                    <VehicleStatusBadge status={vehicle.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {vehicle.plateNumber}
                    </span>
                    {vehicle.categoryName && (
                      <span className="text-xs text-muted-foreground">
                        {vehicle.categoryName}
                      </span>
                    )}
                    <span className="text-xs font-medium text-foreground">
                      {formatCHF(vehicle.dailyRate)}/j
                    </span>
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
