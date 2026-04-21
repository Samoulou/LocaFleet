"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCHF, formatMileage } from "@/lib/utils";
import {
  getReturnValidationPreview,
  validateReturn,
} from "@/actions/validate-return";
import type { ReturnValidationPreview } from "@/actions/validate-return";

// ============================================================================
// Types
// ============================================================================

type ValidateReturnDialogProps = {
  contractId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ============================================================================
// Component
// ============================================================================

export function ValidateReturnDialog({
  contractId,
  open,
  onOpenChange,
}: ValidateReturnDialogProps) {
  const t = useTranslations("contracts.detail");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [preview, setPreview] = useState<ReturnValidationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [validating, setValidating] = useState(false);
  const [damagesAmount, setDamagesAmount] = useState("0");

  // Load preview when dialog opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingPreview(true);
    setPreview(null);
    setDamagesAmount("0");

    getReturnValidationPreview(contractId).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setPreview(result.data);
        setLoadingPreview(false);
      } else {
        setLoadingPreview(false);
        onOpenChange(false);
        toast.error(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, contractId, onOpenChange]);

  async function handleValidate() {
    setValidating(true);
    const parsedDamages = parseFloat(damagesAmount) || 0;

    const result = await validateReturn({
      contractId,
      damagesAmount: parsedDamages,
    });

    setValidating(false);

    if (result.success) {
      toast.success(
        t("validateReturnSuccess", {
          contractNumber: preview?.contractNumber ?? "",
        })
      );
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("validateReturnTitle")}</DialogTitle>
        </DialogHeader>

        {loadingPreview ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : preview ? (
          <div className="space-y-5">
            {/* Warning */}
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                {t("validateReturnWarning")}
              </p>
            </div>

            {/* Summary */}
            <div>
              <h4 className="text-sm font-medium text-slate-900 mb-2">
                {t("summary")}
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("vehicle")}</span>
                  <span className="text-slate-900">
                    {preview.contractNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Mileage */}
            <div>
              <h4 className="text-sm font-medium text-slate-900 mb-2">
                {t("mileage")}
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    {t("departureMileage")}
                  </span>
                  <span className="text-slate-900">
                    {formatMileage(preview.departureMileage)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("returnMileage")}</span>
                  <span className="text-slate-900">
                    {formatMileage(preview.returnMileage)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("kmDriven")}</span>
                  <span className="font-medium text-slate-900">
                    {formatMileage(preview.totalKmDriven)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("kmIncluded")}</span>
                  <span className="text-slate-900">
                    {formatMileage(preview.includedKm)}
                  </span>
                </div>
                {preview.excessKm > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("kmExcess")}</span>
                    <span className="font-medium text-red-600">
                      {formatMileage(preview.excessKm)}
                      {preview.excessKmRate &&
                        ` × ${preview.excessKmRate} CHF/km = ${formatCHF(preview.excessKmAmount)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Damages */}
            <div>
              <h4 className="text-sm font-medium text-slate-900 mb-2">
                {t("damagesFound")}
              </h4>
              {preview.newDamages.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {preview.newDamages.map((damage) => (
                    <li
                      key={damage.id}
                      className="flex items-center gap-2 text-slate-700"
                    >
                      <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                      <span>
                        {damage.zone} — {damage.type} ({damage.severity})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">{t("noDamages")}</p>
              )}
            </div>

            {/* Damages amount input */}
            <div>
              <label
                htmlFor="damagesAmount"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                {t("damagesAmountLabel")}
              </label>
              <Input
                id="damagesAmount"
                type="number"
                min="0"
                step="0.01"
                value={damagesAmount}
                onChange={(e) => setDamagesAmount(e.target.value)}
                className="max-w-[200px]"
              />
            </div>

            {/* Actions that will be performed */}
            <div>
              <h4 className="text-sm font-medium text-slate-900 mb-2">
                {t("actionsPerformed")}
              </h4>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                  {t("actionContractCompleted")}
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
                  {t("actionVehicleAvailable")}
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                  {t("actionInvoiceUpdated")}
                </li>
              </ul>
            </div>
          </div>
        ) : null}

        {preview && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={validating}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleValidate} disabled={validating}>
              {validating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("validating")}
                </>
              ) : (
                t("validateReturnConfirm")
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
