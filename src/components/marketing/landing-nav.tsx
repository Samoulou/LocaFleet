"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Car } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LandingNavProps = {
  isAuthenticated: boolean;
};

export function LandingNav({ isAuthenticated }: LandingNavProps) {
  const t = useTranslations("landing.nav");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-lg"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="size-4.5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            LocaFleet
          </span>
        </a>

        <div className="hidden items-center gap-6 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("features")}
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("howItWorks")}
          </a>
          <a
            href="#trial"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("trial")}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href={isAuthenticated ? "/vehicles" : "/login"}>
              {isAuthenticated ? t("openApp") : t("login")}
            </Link>
          </Button>
          <Button asChild className="group">
            <a href="#trial">
              {t("requestTrial")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </Button>
        </div>
      </nav>
    </header>
  );
}
