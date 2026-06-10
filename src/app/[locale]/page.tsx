import {
  ArrowRight,
  CalendarRange,
  Car,
  ClipboardCheck,
  FileText,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LandingNav } from "@/components/marketing/landing-nav";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { TrialForm } from "@/components/marketing/trial-form";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const features = [
    { icon: CalendarRange, key: "planning" },
    { icon: Car, key: "vehicles" },
    { icon: FileText, key: "contracts" },
    { icon: ClipboardCheck, key: "inspections" },
    { icon: Receipt, key: "invoicing" },
    { icon: ShieldCheck, key: "team" },
  ] as const;

  const stats = [
    { value: "30-100", key: "vehicles" },
    { value: "-40%", key: "time" },
    { value: "100% CHF", key: "billing" },
    { value: "FR / EN", key: "languages" },
  ] as const;

  const steps = ["step1", "step2", "step3"] as const;

  return (
    <div id="top" className="min-h-screen bg-background">
      <LandingNav />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40">
        {/* Animated gradient blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="animate-landing-blob absolute -top-24 left-1/4 size-96 rounded-full bg-primary/15 blur-3xl" />
          <div
            className="animate-landing-blob absolute top-40 right-1/5 size-80 rounded-full bg-chart-2/15 blur-3xl"
            style={{ animationDelay: "4s" }}
          />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
              backgroundSize: "28px 28px",
              maskImage:
                "linear-gradient(to bottom, black 60%, transparent 100%)",
            }}
          />
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span
              className="animate-landing-fade-up inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
              style={{ animationDelay: "0ms" }}
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              {t("hero.badge")}
            </span>

            <h1
              className="animate-landing-fade-up mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl"
              style={{ animationDelay: "100ms" }}
            >
              {t("hero.titleLine1")}{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-chart-2 bg-clip-text text-transparent">
                {t("hero.titleHighlight")}
              </span>
            </h1>

            <p
              className="animate-landing-fade-up mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
              style={{ animationDelay: "200ms" }}
            >
              {t("hero.subtitle")}
            </p>

            <div
              className="animate-landing-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: "300ms" }}
            >
              <Button size="lg" asChild className="group h-12 px-7 text-base">
                <a href="#trial">
                  {t("hero.ctaPrimary")}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-7 text-base"
              >
                <Link href="/login">{t("hero.ctaSecondary")}</Link>
              </Button>
            </div>

            <p
              className="animate-landing-fade-up mt-5 text-sm text-muted-foreground"
              style={{ animationDelay: "400ms" }}
            >
              {t("hero.note")}
            </p>
          </div>

          <div
            className="animate-landing-fade-up mx-auto mt-16 max-w-4xl"
            style={{ animationDelay: "500ms" }}
          >
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal>
            <h2 className="sr-only">{t("stats.title")}</h2>
            <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {stats.map(({ value, key }) => (
                <div key={key} className="text-center">
                  <dd className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {value}
                  </dd>
                  <dt className="mt-2 text-sm text-muted-foreground">
                    {t(`stats.${key}`)}
                  </dt>
                </div>
              ))}
            </dl>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("features.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("features.subtitle")}
            </p>
          </ScrollReveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, key }, i) => (
              <ScrollReveal key={key} delay={i * 80}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`features.${key}.description`)}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-y border-border bg-muted/30 py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("howItWorks.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("howItWorks.subtitle")}
            </p>
          </ScrollReveal>

          <ol className="mt-14 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <ScrollReveal key={step} delay={i * 120}>
                <li className="relative h-full rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                    {t(`howItWorks.${step}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`howItWorks.${step}.description`)}
                  </p>
                </li>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Trial request ─────────────────────────────────────────────── */}
      <section
        id="trial"
        className="relative scroll-mt-20 overflow-hidden py-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="animate-landing-blob absolute bottom-0 left-1/3 size-96 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <ScrollReveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("trial.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("trial.subtitle")}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={150} className="mt-10">
            <TrialForm />
          </ScrollReveal>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
