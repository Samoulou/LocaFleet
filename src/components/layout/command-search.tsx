"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Car, Users, FileText, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { globalSearch, type SearchResults } from "@/actions/search";

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

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

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults(null);
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const seq = ++seqRef.current;
    debounceRef.current = setTimeout(async () => {
      const result = await globalSearch({ query: value });
      if (seq !== seqRef.current) return;
      const emptyResults = { vehicles: [], clients: [], contracts: [] };
      setResults(result.success ? result.data : emptyResults);
      setLoading(false);
    }, 300);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(`/${locale}${href}`);
    },
    [router, locale]
  );

  const hasResults =
    results &&
    (results.vehicles.length > 0 ||
      results.clients.length > 0 ||
      results.contracts.length > 0);

  const showMinChars = query.length > 0 && query.length < 2;
  const showNoResults = query.length >= 2 && !loading && results && !hasResults;

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

      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput
          placeholder={t("topbar.searchPlaceholder")}
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-slate-400" />
            </div>
          )}

          {showMinChars && (
            <div className="py-6 text-center text-sm text-slate-400">
              {t("topbar.searchMinChars")}
            </div>
          )}

          {showNoResults && (
            <CommandEmpty>
              {t("topbar.searchNoResults", { query })}
            </CommandEmpty>
          )}

          {!loading && hasResults && (
            <>
              {results.vehicles.length > 0 && (
                <CommandGroup heading={t("navigation.vehicles")}>
                  {results.vehicles.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle}`}
                      onSelect={() => handleSelect(item.href)}
                    >
                      <Car className="mr-2 size-4 shrink-0" />
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-slate-400">
                          {item.subtitle}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.clients.length > 0 && (
                <CommandGroup heading={t("navigation.clients")}>
                  {results.clients.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle}`}
                      onSelect={() => handleSelect(item.href)}
                    >
                      <Users className="mr-2 size-4 shrink-0" />
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-slate-400">
                          {item.subtitle}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.contracts.length > 0 && (
                <CommandGroup heading={t("navigation.contracts")}>
                  {results.contracts.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle}`}
                      onSelect={() => handleSelect(item.href)}
                    >
                      <FileText className="mr-2 size-4 shrink-0" />
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-slate-400">
                          {item.subtitle}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
