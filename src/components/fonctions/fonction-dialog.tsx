"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createFonction, updateFonction } from "@/actions/fonctions";
import type { FonctionListItem } from "@/actions/fonctions";
import { createFonctionSchema } from "@/lib/validations/fonctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DEFAULT_COLOR = "#2563EB";
const TIME_UNITS = ["hours", "trips", "flat"] as const;
// Radix Select forbids empty-string item values; sentinel for "no unit"
const NO_UNIT = "none";

type FonctionDialogProps = {
  fonction?: FonctionListItem | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function FonctionDialog({
  fonction,
  open,
  onOpenChange,
}: FonctionDialogProps) {
  const t = useTranslations("settings.fonctions.form");
  const tUnits = useTranslations("settings.fonctions.units");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const isEdit = !!fonction;

  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [requiresEmployees, setRequiresEmployees] = useState(
    fonction?.requiresEmployees ?? false
  );
  const [allowsContract, setAllowsContract] = useState(
    fonction?.allowsContract ?? false
  );
  const [defaultTimeUnit, setDefaultTimeUnit] = useState<string>(
    fonction?.defaultTimeUnit ?? NO_UNIT
  );

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled
    ? (v: boolean) => onOpenChange?.(v)
    : setInternalOpen;

  function resetForm() {
    setErrors({});
    setGeneralError(null);
    setLoading(false);
  }

  // Sync controlled-edit state when the dialog opens for a fonction
  function handleOpenChange(v: boolean) {
    setDialogOpen(v);
    if (v) {
      setRequiresEmployees(fonction?.requiresEmployees ?? false);
      setAllowsContract(fonction?.allowsContract ?? false);
      setDefaultTimeUnit(fonction?.defaultTimeUnit ?? NO_UNIT);
    } else {
      resetForm();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: (formData.get("name") as string) ?? "",
      color: (formData.get("color") as string) ?? "",
      requiresEmployees,
      allowsContract,
      defaultTimeUnit: defaultTimeUnit === NO_UNIT ? "" : defaultTimeUnit,
      sortOrder: (formData.get("sortOrder") as string) ?? "",
    };

    // Client-side validation
    const result = createFonctionSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const payload = isEdit ? { ...data, id: fonction.id } : data;
      const actionResult = isEdit
        ? await updateFonction(payload)
        : await createFonction(payload);

      if (!actionResult.success) {
        setGeneralError(actionResult.error);
        return;
      }

      toast.success(isEdit ? t("updateSuccess") : t("createSuccess"));
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const trigger = !isControlled ? (
    <DialogTrigger asChild>
      <Button>
        <Plus className="mr-2 size-4" />
        {t("createTitle")}
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name + Color */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="fonction-name">{t("name")} *</Label>
              <Input
                id="fonction-name"
                name="name"
                defaultValue={fonction?.name ?? ""}
                placeholder={t("namePlaceholder")}
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name ? "fonction-name-error" : undefined
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fonction-color">{t("color")}</Label>
              <Input
                id="fonction-color"
                name="color"
                type="color"
                defaultValue={fonction?.color ?? DEFAULT_COLOR}
                className="h-9 w-14 cursor-pointer p-1"
              />
            </div>
          </div>
          {errors.name && (
            <p
              id="fonction-name-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.name}
            </p>
          )}

          {/* Behavior flags */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="fonction-requiresEmployees">
                  {t("requiresEmployees")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("requiresEmployeesHint")}
                </p>
              </div>
              <Switch
                id="fonction-requiresEmployees"
                checked={requiresEmployees}
                onCheckedChange={setRequiresEmployees}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="fonction-allowsContract">
                  {t("allowsContract")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("allowsContractHint")}
                </p>
              </div>
              <Switch
                id="fonction-allowsContract"
                checked={allowsContract}
                onCheckedChange={setAllowsContract}
              />
            </div>
          </div>

          {/* Default time unit + sort order */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fonction-defaultTimeUnit">
                {t("defaultTimeUnit")}
              </Label>
              <Select
                value={defaultTimeUnit}
                onValueChange={setDefaultTimeUnit}
              >
                <SelectTrigger id="fonction-defaultTimeUnit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_UNIT}>{tUnits("none")}</SelectItem>
                  {TIME_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {tUnits(unit)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fonction-sortOrder">{t("sortOrder")}</Label>
              <Input
                id="fonction-sortOrder"
                name="sortOrder"
                type="number"
                min="0"
                step="1"
                defaultValue={fonction?.sortOrder ?? 0}
              />
              {errors.sortOrder && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.sortOrder}
                </p>
              )}
            </div>
          </div>

          {/* General Error */}
          {generalError && (
            <p className="text-sm text-destructive" role="alert">
              {generalError}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {isEdit ? t("updating") : t("creating")}
                </>
              ) : isEdit ? (
                t("updateButton")
              ) : (
                t("createButton")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
