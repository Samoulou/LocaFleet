"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Car, Users, FileText } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command";

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const t = useTranslations();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-100 transition-colors flex-1 max-w-md mx-auto"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">
          {t("topbar.searchPlaceholder")}
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-400">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("topbar.searchPlaceholder")} />
        <CommandList>
          <CommandEmpty>{t("topbar.searchEmpty")}</CommandEmpty>
          <CommandGroup heading={t("navigation.vehicles")}>
            <div className="px-2 py-3 text-center text-xs text-slate-400">
              <Car className="mx-auto mb-1 size-4" />
              {t("topbar.searchEmpty")}
            </div>
          </CommandGroup>
          <CommandGroup heading={t("navigation.clients")}>
            <div className="px-2 py-3 text-center text-xs text-slate-400">
              <Users className="mx-auto mb-1 size-4" />
              {t("topbar.searchEmpty")}
            </div>
          </CommandGroup>
          <CommandGroup heading={t("navigation.contracts")}>
            <div className="px-2 py-3 text-center text-xs text-slate-400">
              <FileText className="mx-auto mb-1 size-4" />
              {t("topbar.searchEmpty")}
            </div>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
