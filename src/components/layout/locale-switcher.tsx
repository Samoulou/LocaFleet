"use client";

import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");

  const nextLocale = locale === "fr" ? "en" : "fr";
  const tooltipLabel = nextLocale === "fr" ? t("languageFr") : t("languageEn");

  function handleSwitch() {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSwitch}
          aria-label={t("language")}
        >
          <Globe className="size-5 text-slate-500" />
          <span className="sr-only">{tooltipLabel}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}
