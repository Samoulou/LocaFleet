"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createMaintenanceRecord } from "@/actions/maintenance";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateMaintenanceDialogProps = {
  vehicleId: string;
};

const MAINTENANCE_TYPES = [
  "regular_service",
  "repair",
  "technical_inspection",
  "tires",
  "other",
] as const;

const URGENCY_LEVELS = ["low", "medium", "high"] as const;

export function CreateMaintenanceDialog({
  vehicleId,
}: CreateMaintenanceDialogProps) {
  const t = useTranslations("maintenance.create");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [estimatedCost, setEstimatedCost] = useState("");
  const [mechanicName, setMechanicName] = useState("");
  const [mechanicEmail, setMechanicEmail] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setType("");
    setUrgency("medium");
    setDescription("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEstimatedCost("");
    setMechanicName("");
    setMechanicEmail("");
    setNotes("");
    setError(null);
  }

  async function handleSubmit() {
    if (!type || !description) return;

    setLoading(true);
    setError(null);

    try {
      const result = await createMaintenanceRecord({
        vehicleId,
        type,
        description,
        startDate,
        estimatedCost: estimatedCost || "",
        mechanicName: mechanicName || "",
        mechanicEmail: mechanicEmail || "",
        urgency,
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
        <Button>
          <Plus className="mr-2 size-4" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type + Urgency row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("type")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((mt) => (
                    <SelectItem key={mt} value={mt}>
                      {t(`types.${mt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("urgency")}</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {t(`urgencies.${level}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t("description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              maxLength={2000}
              rows={3}
            />
          </div>

          {/* Start date + Estimated cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("estimatedCost")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder={t("estimatedCostPlaceholder")}
              />
            </div>
          </div>

          {/* Mechanic name + email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("mechanicName")}</Label>
              <Input
                value={mechanicName}
                onChange={(e) => setMechanicName(e.target.value)}
                placeholder={t("mechanicNamePlaceholder")}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("mechanicEmail")}</Label>
              <Input
                type="email"
                value={mechanicEmail}
                onChange={(e) => setMechanicEmail(e.target.value)}
                placeholder={t("mechanicEmailPlaceholder")}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              maxLength={2000}
              rows={2}
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
            <Button
              onClick={handleSubmit}
              disabled={loading || !type || !description}
            >
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
