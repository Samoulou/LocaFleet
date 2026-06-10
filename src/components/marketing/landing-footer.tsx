import { Car } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function LandingFooter() {
  const t = await getTranslations("landing.footer");

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Car className="size-4.5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-foreground">
                LocaFleet
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t("tagline")}</p>
            <p className="text-sm text-muted-foreground">🇨🇭 {t("madeIn")}</p>
          </div>

          <div className="flex gap-16">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                {t("product")}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#features"
                    className="transition-colors hover:text-foreground"
                  >
                    {t("features")}
                  </a>
                </li>
                <li>
                  <a
                    href="#trial"
                    className="transition-colors hover:text-foreground"
                  >
                    {t("trial")}
                  </a>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="transition-colors hover:text-foreground"
                  >
                    {t("login")}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                {t("company")}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="mailto:sales@locafleet.ch"
                    className="transition-colors hover:text-foreground"
                  >
                    {t("contact")}
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:support@locafleet.ch"
                    className="transition-colors hover:text-foreground"
                  >
                    {t("support")}
                  </a>
                </li>
                <li>
                  <span className="cursor-default">{t("legal")}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
