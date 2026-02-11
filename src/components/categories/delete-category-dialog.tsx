"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { deleteCategory } from "@/actions/categories";
import type { CategoryWithCount } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteCategoryDialogProps = {
  category: CategoryWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteCategoryDialog({
  category,
  open,
  onOpenChange,
}: DeleteCategoryDialogProps) {
  const t = useTranslations("settings.categories.delete");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasVehicles = (category?.vehicleCount ?? 0) > 0;

  async function handleDelete() {
    if (!category || hasVehicles) return;

    setLoading(true);
    setError(null);

    try {
      const result = await deleteCategory(category.id);

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast.success(t("success"));
      onOpenChange(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setError(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { name: category?.name ?? "" })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasVehicles && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              {t("warning", { count: category?.vehicleCount ?? 0 })}
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || hasVehicles}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("deleting")}
              </>
            ) : (
              t("confirm")
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
