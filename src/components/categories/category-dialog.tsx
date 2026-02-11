"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createCategory, updateCategory } from "@/actions/categories";
import type { CategoryWithCount } from "@/actions/categories";
import { createCategorySchema } from "@/lib/validations/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CategoryDialogProps = {
  category?: CategoryWithCount | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CategoryDialog({
  category,
  open,
  onOpenChange,
}: CategoryDialogProps) {
  const t = useTranslations("settings.categories.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const isEdit = !!category;

  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: (formData.get("name") as string) ?? "",
      description: (formData.get("description") as string) ?? "",
      dailyRate: (formData.get("dailyRate") as string) ?? "",
      weeklyRate: (formData.get("weeklyRate") as string) ?? "",
      sortOrder: (formData.get("sortOrder") as string) ?? "",
    };

    // Client-side validation
    const result = createCategorySchema.safeParse(data);
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
      const payload = isEdit ? { ...data, id: category.id } : data;
      const actionResult = isEdit
        ? await updateCategory(payload)
        : await createCategory(payload);

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
    <Dialog
      open={dialogOpen}
      onOpenChange={(v) => {
        setDialogOpen(v);
        if (!v) resetForm();
      }}
    >
      {trigger}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="cat-name">{t("name")} *</Label>
            <Input
              id="cat-name"
              name="name"
              defaultValue={category?.name ?? ""}
              placeholder={t("namePlaceholder")}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p
                id="name-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="cat-description">{t("description")}</Label>
            <Textarea
              id="cat-description"
              name="description"
              defaultValue={category?.description ?? ""}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              maxLength={500}
            />
            {errors.description && (
              <p className="text-sm text-destructive" role="alert">
                {errors.description}
              </p>
            )}
          </div>

          {/* Rates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-dailyRate">{t("dailyRate")}</Label>
              <Input
                id="cat-dailyRate"
                name="dailyRate"
                type="number"
                step="0.01"
                min="0"
                defaultValue={category?.dailyRate ?? ""}
                placeholder={t("dailyRatePlaceholder")}
              />
              {errors.dailyRate && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.dailyRate}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-weeklyRate">{t("weeklyRate")}</Label>
              <Input
                id="cat-weeklyRate"
                name="weeklyRate"
                type="number"
                step="0.01"
                min="0"
                defaultValue={category?.weeklyRate ?? ""}
                placeholder={t("weeklyRatePlaceholder")}
              />
              {errors.weeklyRate && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.weeklyRate}
                </p>
              )}
            </div>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label htmlFor="cat-sortOrder">{t("sortOrder")}</Label>
            <Input
              id="cat-sortOrder"
              name="sortOrder"
              type="number"
              min="0"
              step="1"
              defaultValue={category?.sortOrder ?? 0}
              placeholder={t("sortOrderPlaceholder")}
            />
            {errors.sortOrder && (
              <p className="text-sm text-destructive" role="alert">
                {errors.sortOrder}
              </p>
            )}
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
