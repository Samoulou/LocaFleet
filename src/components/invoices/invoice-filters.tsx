"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

const ALL_PERIODS = "all";

const PERIOD_OPTIONS = [
  { value: "this_month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "this_quarter", label: "Ce trimestre" },
  { value: "this_year", label: "Cette année" },
];

function DebouncedSearchInput({
  defaultValue,
  onSearch,
}: {
  defaultValue: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== defaultValue) {
        onSearch(value);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, defaultValue, onSearch]);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        placeholder="Rechercher par n° facture ou client..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}

export function InvoiceFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") ?? "";
  const currentPeriod = searchParams.get("period") ?? ALL_PERIODS;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const query = params.toString();
      router.push(`/invoices${query ? `?${query}` : ""}`);
    },
    [router, searchParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      updateParams({ search: value || null });
    },
    [updateParams]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <DebouncedSearchInput
        key={currentSearch}
        defaultValue={currentSearch}
        onSearch={handleSearch}
      />

      <Select
        value={currentPeriod}
        onValueChange={(value) => updateParams({ period: value })}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Toutes les périodes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PERIODS}>Toutes les périodes</SelectItem>
          {PERIOD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
