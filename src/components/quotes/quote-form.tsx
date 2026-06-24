"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { createQuote, updateQuote, type QuoteDetail } from "@/actions/quotes";
import type { FonctionSelectItem } from "@/actions/events";
import { ClientAutocomplete } from "@/components/contracts/client-autocomplete";
import { formatCHF } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LineDraft = {
  description: string;
  quantity: string;
  unitPrice: string;
};

type QuoteFormProps = {
  fonctions: FonctionSelectItem[];
  /** Present in edit mode (drafts only) */
  quote?: QuoteDetail;
};

function toInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const EMPTY_LINE: LineDraft = { description: "", quantity: "1", unitPrice: "" };

export function QuoteForm({ fonctions, quote }: QuoteFormProps) {
  const t = useTranslations("quotes.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const isEdit = !!quote;

  const [fonctionId, setFonctionId] = useState(quote?.fonction.id ?? "");
  const [clientId, setClientId] = useState(quote?.client.id ?? "");
  const [title, setTitle] = useState(quote?.title ?? "");
  const [startDate, setStartDate] = useState(
    quote?.startDate ? toInputValue(quote.startDate) : ""
  );
  const [endDate, setEndDate] = useState(
    quote?.endDate ? toInputValue(quote.endDate) : ""
  );
  const [validUntil, setValidUntil] = useState(quote?.validUntil ?? "");
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    quote?.lineItems.map((line) => ({
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: line.unitPrice,
    })) ?? [{ ...EMPTY_LINE }]
  );

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = lines.reduce((sum, line) => {
    const quantity = parseFloat(line.quantity);
    const unitPrice = parseFloat(line.unitPrice);
    if (isNaN(quantity) || isNaN(unitPrice)) return sum;
    return sum + quantity * unitPrice;
  }, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError(null);
    setLoading(true);
    try {
      const payload = {
        ...(isEdit ? { id: quote.id } : {}),
        clientId,
        fonctionId,
        title,
        startDate,
        endDate,
        validUntil,
        notes,
        lineItems: lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      };

      const result = isEdit
        ? await updateQuote(payload)
        : await createQuote(payload);

      if (!result.success) {
        setGeneralError(result.error);
        return;
      }

      toast.success(isEdit ? t("updateSuccess") : t("createSuccess"));
      router.push(`/quotes/${result.data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="quote-fonction">{t("fonction")} *</Label>
            {/* Plain text items only: Radix ItemText breaks selection with
                rich markup under the default item-aligned positioning */}
            <Select value={fonctionId} onValueChange={setFonctionId}>
              <SelectTrigger id="quote-fonction" className="w-full">
                <SelectValue placeholder={t("fonctionPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {fonctions.map((fonction) => (
                  <SelectItem key={fonction.id} value={fonction.id}>
                    {fonction.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fonctions.length === 0 && (
              <p className="text-xs text-amber-600">
                {t("noFonctions")}{" "}
                <Link
                  href="/settings/fonctions"
                  className="font-medium underline"
                >
                  {t("noFonctionsLink")}
                </Link>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("client")} *</Label>
            {isEdit && (
              <p className="text-sm text-muted-foreground">
                {t("currentClient")} : {quote.client.firstName}{" "}
                {quote.client.lastName}
              </p>
            )}
            <ClientAutocomplete
              value={clientId}
              onChange={(id) => setClientId(id)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-title">{t("title")}</Label>
            <Input
              id="quote-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quote-start">{t("startDate")}</Label>
              <Input
                id="quote-start"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-end">{t("endDate")}</Label>
              <Input
                id="quote-end"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("periodHint")}</p>

          <div className="space-y-2">
            <Label htmlFor="quote-validUntil">{t("validUntil")}</Label>
            <Input
              id="quote-validUntil"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-notes">{t("notes")}</Label>
            <Textarea
              id="quote-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Right column — line items */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Label>{t("lines")} *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
            >
              <Plus className="mr-1 size-4" />
              {t("addLine")}
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="space-y-2 rounded-md border p-3">
                <Input
                  value={line.description}
                  onChange={(e) =>
                    updateLine(index, { description: e.target.value })
                  }
                  placeholder={t("lineDescriptionPlaceholder")}
                />
                <div className="flex items-end gap-2">
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">{t("lineQuantity")}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(index, { quantity: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">{t("lineUnitPrice")}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(index, { unitPrice: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex-1 pb-2 text-right text-sm text-muted-foreground">
                    {(() => {
                      const quantity = parseFloat(line.quantity);
                      const unitPrice = parseFloat(line.unitPrice);
                      return isNaN(quantity) || isNaN(unitPrice)
                        ? "—"
                        : formatCHF(quantity * unitPrice);
                    })()}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    disabled={lines.length === 1}
                    onClick={() => removeLine(index)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">{t("removeLine")}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t pt-3 text-sm font-semibold">
            {t("subtotal")} : {formatCHF(subtotal)}
          </div>
        </div>
      </div>

      {generalError && (
        <p className="text-sm text-destructive" role="alert">
          {generalError}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {isEdit ? t("updating") : t("creating")}
            </>
          ) : isEdit ? (
            t("updateButton")
          ) : (
            t("createButton")
          )}
        </Button>
      </div>
    </form>
  );
}
