"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditClientSheet } from "@/components/clients/edit-client-sheet";

export function ClientsPageHeader() {
  const t = useTranslations("clients");
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>
      <Button onClick={() => setSheetOpen(true)}>
        <Plus className="mr-2 size-4" />
        {t("newClient")}
      </Button>

      <EditClientSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
