import {
  CalendarRange,
  Car,
  FileText,
  LayoutDashboard,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

const PLANNING_ROWS = [
  { label: "VD 123 456", offset: "8%", width: "34%", color: "bg-primary/80" },
  { label: "GE 789 012", offset: "30%", width: "42%", color: "bg-chart-2/80" },
  { label: "VS 345 678", offset: "55%", width: "30%", color: "bg-chart-4/80" },
  { label: "FR 901 234", offset: "12%", width: "56%", color: "bg-primary/60" },
];

export async function HeroPreview() {
  const t = await getTranslations("landing.preview");

  const navItems = [
    { icon: LayoutDashboard, label: t("dashboard"), active: true },
    { icon: Car, label: t("fleet"), active: false },
    { icon: CalendarRange, label: t("planning"), active: false },
    { icon: FileText, label: t("contracts"), active: false },
    { icon: Receipt, label: t("invoices"), active: false },
  ];

  const stats = [
    { label: t("vehiclesAvailable"), value: "42" },
    { label: t("activeContracts"), value: "18" },
    { label: t("monthlyRevenue"), value: "86'400.00 CHF" },
    { label: t("occupancyRate"), value: "78%" },
  ];

  return (
    <div
      className="animate-landing-float select-none"
      aria-hidden="true"
      role="presentation"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 ring-1 ring-border/50">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-destructive/40" />
          <span className="size-2.5 rounded-full bg-chart-4/50" />
          <span className="size-2.5 rounded-full bg-chart-2/50" />
          <span className="ml-3 hidden rounded-md bg-background px-3 py-0.5 text-[10px] text-muted-foreground sm:block">
            app.locafleet.ch
          </span>
        </div>

        <div className="flex">
          {/* Sidebar — the app is sidebar-only navigation */}
          <div className="hidden w-40 shrink-0 flex-col gap-1 border-r border-border bg-sidebar p-3 sm:flex">
            <div className="mb-2 flex items-center gap-1.5 px-2">
              <span className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
                <Car className="size-3" />
              </span>
              <span className="text-xs font-bold text-sidebar-foreground">
                LocaFleet
              </span>
            </div>
            {navItems.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="size-3" />
                {label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 space-y-4 bg-background p-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {stats.map(({ label, value }, i) => (
                <div
                  key={label}
                  className="animate-landing-fade-up rounded-lg border border-border bg-card p-3"
                  style={{ animationDelay: `${300 + i * 120}ms` }}
                >
                  <p className="truncate text-[10px] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-sm font-bold text-card-foreground">
                    {value}
                    {i === 2 && <TrendingUp className="size-3 text-chart-2" />}
                  </p>
                </div>
              ))}
            </div>

            {/* Planning timeline */}
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-3 text-[10px] font-medium text-muted-foreground">
                {t("planning")}
              </p>
              <div className="space-y-2.5">
                {PLANNING_ROWS.map(({ label, offset, width, color }, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 font-mono text-[9px] text-muted-foreground">
                      {label}
                    </span>
                    <div className="relative h-4 flex-1 rounded bg-muted">
                      <div
                        className={cn(
                          "animate-landing-grow-x absolute inset-y-0 rounded",
                          color
                        )}
                        style={{
                          left: offset,
                          width,
                          animationDelay: `${600 + i * 150}ms`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
