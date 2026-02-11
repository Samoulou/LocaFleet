"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { changeVehicleStatus } from "@/actions/vehicle-status";
import { ALLOWED_TRANSITIONS } from "@/lib/validations/vehicle-status";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { VehicleStatus } from "@/types";

type ChangeStatusDialogProps = {
  vehicleId: string;
  currentStatus: VehicleStatus;
};

const MAINTENANCE_TYPES = [
  "regular_service",
  "repair",
  "technical_inspection",
  "tires",
  "other",
] as const;

export function ChangeStatusDialog({
  vehicleId,
  currentStatus,
}: ChangeStatusDialogProps) {
  const t = useTranslations("vehicles.statusChange");
  const tStatus = useTranslations("vehicles.status");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<VehicleStatus | "">("");
  const [reason, setReason] = useState("");
  const [createMaintenance, setCreateMaintenance] = useState(false);
  const [maintenanceDescription, setMaintenanceDescription] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("");

  const isRented = currentStatus === "rented";
  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus];

  function resetForm() {
    setNewStatus("");
    setReason("");
    setCreateMaintenance(false);
    setMaintenanceDescription("");
    setMaintenanceType("");
    setError(null);
  }

  async function handleSubmit() {
    if (!newStatus || isRented) return;

    setLoading(true);
    setError(null);

    try {
      const result = await changeVehicleStatus({
        vehicleId,
        newStatus,
        reason: reason || undefined,
        createMaintenanceRecord: createMaintenance,
        maintenanceDescription: createMaintenance
          ? maintenanceDescription
          : undefined,
        maintenanceType: createMaintenance ? maintenanceType : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast.success(t("success"));
      setOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="default">
          <RefreshCw className="mr-2 size-4" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current status */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {t("currentStatus")}:
            <VehicleStatusBadge status={currentStatus} />
          </div>

          {/* Rented warning */}
          {isRented && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">{t("rentedWarning")}</p>
            </div>
          )}

          {/* Status select */}
          {!isRented && (
            <>
              <div className="space-y-2">
                <Label>{t("newStatus")}</Label>
                <Select
                  value={newStatus}
                  onValueChange={(v) => {
                    setNewStatus(v as VehicleStatus);
                    if (v !== "maintenance") {
                      setCreateMaintenance(false);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("newStatusPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTargets.map((status) => (
                      <SelectItem key={status} value={status}>
                        {tStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label>{t("reason")}</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("reasonPlaceholder")}
                  maxLength={500}
                  rows={2}
                />
              </div>

              {/* Maintenance record option */}
              {newStatus === "maintenance" && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="create-maintenance"
                      checked={createMaintenance}
                      onCheckedChange={(v) => setCreateMaintenance(v === true)}
                    />
                    <Label
                      htmlFor="create-maintenance"
                      className="cursor-pointer text-sm font-normal"
                    >
                      {t("createMaintenance")}
                    </Label>
                  </div>

                  {createMaintenance && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>{t("maintenanceType")}</Label>
                        <Select
                          value={maintenanceType}
                          onValueChange={setMaintenanceType}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("maintenanceTypePlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {MAINTENANCE_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {t(`maintenanceTypes.${type}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("maintenanceDescription")}</Label>
                        <Textarea
                          value={maintenanceDescription}
                          onChange={(e) =>
                            setMaintenanceDescription(e.target.value)
                          }
                          placeholder={t("maintenanceDescriptionPlaceholder")}
                          maxLength={2000}
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {/* Actions */}
          {!isRented && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !newStatus}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  t("submitButton")
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
