"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Loader2, UserPlus, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchClients } from "@/actions/clients";
import { QuickCreateClientDialog } from "@/components/contracts/quick-create-client-dialog";
import type { ClientSelectItem } from "@/actions/contracts";

type ClientAutocompleteProps = {
  value: string;
  onChange: (clientId: string, client: ClientSelectItem) => void;
};

export function ClientAutocomplete({
  value,
  onChange,
}: ClientAutocompleteProps) {
  const t = useTranslations("contracts.create");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientSelectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSelectItem | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  // Track the latest search to avoid race conditions
  const latestQueryRef = useRef("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    latestQueryRef.current = searchQuery;
    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await searchClients(trimmed);

    // Only update if this is still the latest query (prevent race conditions)
    if (latestQueryRef.current === searchQuery) {
      if (result.success) {
        setResults(result.data);
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  function handleSelect(client: ClientSelectItem) {
    setSelectedClient(client);
    onChange(client.id, client);
    setOpen(false);
    setQuery("");
  }

  function handleClientCreated(client: ClientSelectItem) {
    setSelectedClient(client);
    onChange(client.id, client);
    setDialogOpen(false);
    setOpen(false);
    setQuery("");
  }

  const displayLabel = selectedClient
    ? `${selectedClient.lastName} ${selectedClient.firstName}`
    : value
      ? value
      : undefined;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {displayLabel ? (
              <span className="flex items-center gap-2 truncate">
                <span className="truncate">{displayLabel}</span>
                {selectedClient?.isTrusted && (
                  <BadgeCheck className="size-4 text-emerald-600 shrink-0" />
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {t("clientPlaceholder")}
              </span>
            )}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("searchClientPlaceholder")}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <CommandEmpty>{t("noClientsFound")}</CommandEmpty>
              )}
              {!loading && query.trim().length < 2 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {t("searchClientPlaceholder")}
                </div>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup>
                  {results.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.id}
                      onSelect={() => handleSelect(client)}
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {client.lastName} {client.firstName}
                          {client.isTrusted && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-emerald-600 font-normal">
                              <BadgeCheck className="size-3.5" />
                              {t("trustedClient")}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {client.email} &middot; {client.phone}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setDialogOpen(true);
                  }}
                >
                  <UserPlus className="size-4 text-primary" />
                  <span className="text-primary font-medium">
                    {t("newClientButton")}
                  </span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickCreateClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClientCreated={handleClientCreated}
      />
    </>
  );
}
