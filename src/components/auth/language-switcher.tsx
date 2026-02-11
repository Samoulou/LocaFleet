"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    if (newLocale === currentLocale) return;
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-white text-sm">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          className={cn(
            "px-3 py-1 font-medium transition-colors",
            locale === currentLocale
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
