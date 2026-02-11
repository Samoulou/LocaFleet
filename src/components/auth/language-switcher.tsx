"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const locales = ["fr", "en"] as const;

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: (typeof locales)[number]) {
    if (newLocale === currentLocale) return;
    const newPath = pathname.replace(
      new RegExp(`^/${currentLocale}`),
      `/${newLocale}`
    );
    router.push(newPath);
  }

  return (
    <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-white text-sm">
      {locales.map((locale) => (
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
