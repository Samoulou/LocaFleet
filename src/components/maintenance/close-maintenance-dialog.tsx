"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { closeMaintenanceRecord } from "@/actions/maintenance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CloseMaintenanceDialogProps = {
  maintenanceId: string;
  disabled?: boolean;
};

export function CloseMaintenanceDialog({
  maintenanceId,
  disabled,
}: CloseMaintenanceDialogProps) {
  const t = useTranslations("maintenance.close");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [finalCost, setFinalCost] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setEndDate(new Date().toISOString().split("T")[0]);
    setFinalCost("");
    setNotes("");
    setError(null);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const result = await closeMaintenanceRecord({
        maintenanceId,
        endDate,
        finalCost: finalCost || "",
        notes: notes || "",
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
        <Button variant="outline" size="sm" disabled={disabled}>
          <CheckCircle2 className="mr-1.5 size-3.5" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* End date */}
          <div className="space-y-2">
            <Label>{t("endDate")}</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Final cost */}
          <div className="space-y-2">
            <Label>{t("finalCost")}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={finalCost}
              onChange={(e) => setFinalCost(e.target.value)}
              placeholder={t("finalCostPlaceholder")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              maxLength={2000}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
