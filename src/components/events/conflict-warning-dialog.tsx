"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { EventConflicts } from "@/actions/events";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConflictWarningDialogProps = {
  open: boolean;
  conflicts: EventConflicts | null;
  loading: boolean;
  vehicleLabelById: (vehicleId: string) => string;
  employeeNameById: (userId: string) => string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConflictWarningDialog({
  open,
  conflicts,
  loading,
  vehicleLabelById,
  employeeNameById,
  onConfirm,
  onCancel,
}: ConflictWarningDialogProps) {
  const t = useTranslations("events.conflicts");
  const tCommon = useTranslations("common");

  if (!conflicts) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">{t("description")}</p>

          {conflicts.missingEmployees && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
              {t("missingEmployees")}
            </div>
          )}

          {conflicts.vehicleConflicts.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="font-medium text-amber-800">
                {t("vehicleConflicts")}
              </p>
              <ul className="mt-1 list-inside list-disc text-amber-800">
                {conflicts.vehicleConflicts.map((conflict, index) => (
                  <li key={`${conflict.refId}-${conflict.vehicleId}-${index}`}>
                    {t("vehicleConflictLine", {
                      vehicle: vehicleLabelById(conflict.vehicleId),
                      ref: conflict.refNumber,
                      start: formatDate(conflict.startDate),
                      end: formatDate(conflict.endDate),
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {conflicts.employeeConflicts.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="font-medium text-amber-800">
                {t("employeeConflicts")}
              </p>
              <ul className="mt-1 list-inside list-disc text-amber-800">
                {conflicts.employeeConflicts.map((conflict, index) => (
                  <li key={`${conflict.eventId}-${conflict.userId}-${index}`}>
                    {t("employeeConflictLine", {
                      employee: employeeNameById(conflict.userId),
                      ref: conflict.eventNumber,
                      start: formatDate(conflict.startDate),
                      end: formatDate(conflict.endDate),
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("confirming")}
              </>
            ) : (
              t("confirmAnyway")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
