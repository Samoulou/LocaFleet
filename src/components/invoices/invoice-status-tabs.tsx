"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { InvoiceStatusCounts } from "@/actions/invoices";
import type { InvoiceStatus } from "@/types";

type TabConfig = {
  key: InvoiceStatus | "all";
  label: string;
};

const TABS: TabConfig[] = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "invoiced", label: "Facturé" },
  { key: "paid", label: "Payé" },
  { key: "cancelled", label: "Annulé" },
];

type InvoiceStatusTabsProps = {
  counts: InvoiceStatusCounts | null;
};

export function InvoiceStatusTabs({ counts }: InvoiceStatusTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "all";

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (tab === "all") {
      params.delete("status");
    } else {
      params.set("status", tab);
    }

    const query = params.toString();
    router.push(`/invoices${query ? `?${query}` : ""}`);
  };

  return (
    <div className="flex gap-0 border-b">
      {TABS.map((tab) => {
        const isActive = currentStatus === tab.key;
        const tabCount =
          tab.key !== "all" && counts ? counts[tab.key as InvoiceStatus] : null;

        return (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              "relative px-4 py-2.5 text-sm transition-colors",
              isActive
                ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
            {tabCount !== null && tabCount > 0 && (
              <span
                className={cn(
                  "ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs",
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {tabCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
