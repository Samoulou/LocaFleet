"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cancelMaintenanceRecord } from "@/actions/maintenance";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CancelMaintenanceDialogProps = {
  maintenanceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CancelMaintenanceDialog({
  maintenanceId,
  open,
  onOpenChange,
}: CancelMaintenanceDialogProps) {
  const t = useTranslations("maintenance.cancel");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);

    try {
      const result = await cancelMaintenanceRecord(maintenanceId);

      if (!result.success) {
        toast.error(result.error);
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <XCircle className="mr-2 size-4" />
                {t("confirm")}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
