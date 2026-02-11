"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FilePlus2, ChevronDown, ChevronUp, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ContractPriceSummary } from "@/components/contracts/contract-price-summary";
import { ClientAutocomplete } from "@/components/contracts/client-autocomplete";
import {
  getRentalOptionsForTenant,
  createDraftContract,
  type ClientSelectItem,
  type RentalOptionItem,
} from "@/actions/contracts";
import { createContractSchema } from "@/lib/validations/contracts";
import { formatCHF, computeRentalDays } from "@/lib/utils";

type NewContractSheetProps = {
  vehicleId: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlateNumber: string;
  vehicleStatus: string;
  dailyRate: number;
  categoryName: string | null;
};

export function NewContractSheet({
  vehicleId,
  vehicleBrand,
  vehicleModel,
  vehiclePlateNumber,
  dailyRate,
  categoryName,
}: NewContractSheetProps) {
  const t = useTranslations("contracts.create");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Data from server
  const [optionsList, setOptionsList] = useState<RentalOptionItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSelectItem | null>(
    null
  );

  // Form state
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [clientId, setClientId] = useState("");
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [includedKmPerDay, setIncludedKmPerDay] = useState("");
  const [excessKmRate, setExcessKmRate] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculated rental duration
  const rentalInfo =
    startDate && endDate ? computeRentalDays(startDate, endDate) : null;
  const totalDays = rentalInfo?.billedDays ?? null;
  const totalHours = rentalInfo?.totalHours ?? null;

  // Fetch data when sheet opens
  async function fetchData() {
    setLoadingData(true);
    const optionsResult = await getRentalOptionsForTenant();

    if (optionsResult.success) {
      setOptionsList(optionsResult.data);
    }
    setLoadingData(false);
  }

  // Reset form on close
  function resetForm() {
    setStartDate(undefined);
    setEndDate(undefined);
    setClientId("");
    setSelectedClient(null);
    setSelectedOptionIds([]);
    setPaymentMethod("");
    setIncludedKmPerDay("");
    setExcessKmRate("");
    setDepositAmount("");
    setPickupLocation("");
    setReturnLocation("");
    setNotes("");
    setErrors({});
    setShowAdvanced(false);
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      fetchData();
    } else {
      resetForm();
    }
  }

  // Toggle option selection
  function toggleOption(optionId: string) {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  }

  // Build selected options for price summary
  const selectedOptionsForSummary = optionsList
    .filter((o) => selectedOptionIds.includes(o.id))
    .map((o) => ({
      name: o.name,
      dailyPrice: parseFloat(o.dailyPrice),
      isPerDay: o.isPerDay,
    }));

  // Submit handler
  async function handleSubmit() {
    setErrors({});

    const formData = {
      vehicleId,
      clientId,
      startDate,
      endDate,
      paymentMethod,
      selectedOptionIds,
      includedKmPerDay,
      excessKmRate,
      depositAmount,
      pickupLocation,
      returnLocation,
      notes,
    };

    // Client-side validation
    const validation = createContractSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0]?.toString();
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const result = await createDraftContract(formData);
    setSubmitting(false);

    if (result.success) {
      toast.success(
        t("success", { contractNumber: result.data.contractNumber })
      );
      handleOpenChange(false);
      router.push(`/contracts/${result.data.id}`);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FilePlus2 className="mr-2 size-4" />
        {t("button")}
      </Button>

      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          {/* 1. Vehicle info card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              {vehicleBrand} {vehicleModel}
            </p>
            <p className="text-xs text-slate-500">{vehiclePlateNumber}</p>
            <div className="flex gap-4 text-xs text-slate-500">
              {categoryName && (
                <span>
                  {t("category")}: {categoryName}
                </span>
              )}
              <span>
                {t("dailyRate")}: {formatCHF(dailyRate)}
              </span>
            </div>
          </div>

          {/* 2. Date pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("startDate")}</Label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder={t("startDatePlaceholder")}
                showTime
                confirmLabel={t("confirmTime")}
              />
              {errors.startDate && (
                <p className="text-xs text-red-500">{errors.startDate}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("endDate")}</Label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder={t("endDatePlaceholder")}
                fromDate={startDate}
                showTime
                confirmLabel={t("confirmTime")}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>
          {totalDays !== null && totalDays > 0 && totalHours !== null && (
            <p className="text-sm text-slate-600 -mt-4">
              {t("duration", { hours: totalHours, days: totalDays })}
            </p>
          )}

          {/* 3. Client autocomplete */}
          <div className="space-y-1.5">
            <Label>{t("client")}</Label>
            <ClientAutocomplete
              value={clientId}
              onChange={(id, client) => {
                setClientId(id);
                setSelectedClient(client);
              }}
            />
            {selectedClient?.isTrusted && (
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <BadgeCheck className="size-3.5" />
                {t("trustedClient")}
              </div>
            )}
            {errors.clientId && (
              <p className="text-xs text-red-500">{errors.clientId}</p>
            )}
          </div>

          {/* 4. Options checkboxes */}
          <div className="space-y-1.5">
            <Label>{t("options")}</Label>
            {loadingData ? (
              <p className="text-sm text-slate-400">{t("loadingOptions")}</p>
            ) : optionsList.length === 0 ? (
              <p className="text-sm text-slate-400">{t("noOptions")}</p>
            ) : (
              <div className="space-y-2">
                {optionsList.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedOptionIds.includes(opt.id)}
                      onCheckedChange={() => toggleOption(opt.id)}
                    />
                    <span className="text-sm text-slate-700">{opt.name}</span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {formatCHF(parseFloat(opt.dailyPrice))}
                      {opt.isPerDay ? t("perDay") : ` ${t("oneTime")}`}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 5. Payment method */}
          <div className="space-y-1.5">
            <Label>{t("paymentMethod")}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder={t("paymentMethodPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_departure">
                  {t("paymentMethods.cash_departure")}
                </SelectItem>
                <SelectItem value="cash_return">
                  {t("paymentMethods.cash_return")}
                </SelectItem>
                <SelectItem value="invoice">
                  {t("paymentMethods.invoice")}
                </SelectItem>
                <SelectItem value="card">{t("paymentMethods.card")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-xs text-red-500">{errors.paymentMethod}</p>
            )}
          </div>

          {/* 6. Advanced settings (collapsible) */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              {t("advancedSettings")}
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("includedKmPerDay")}</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder={t("includedKmPerDayPlaceholder")}
                      value={includedKmPerDay}
                      onChange={(e) => setIncludedKmPerDay(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("excessKmRate")}</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={t("excessKmRatePlaceholder")}
                      value={excessKmRate}
                      onChange={(e) => setExcessKmRate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("depositAmount")}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder={t("depositAmountPlaceholder")}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("pickupLocation")}</Label>
                    <Input
                      placeholder={t("pickupLocationPlaceholder")}
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("returnLocation")}</Label>
                    <Input
                      placeholder={t("returnLocationPlaceholder")}
                      value={returnLocation}
                      onChange={(e) => setReturnLocation(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("notes")}</Label>
                  <Textarea
                    placeholder={t("notesPlaceholder")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 7. Price summary */}
          <ContractPriceSummary
            dailyRate={dailyRate}
            totalDays={totalDays}
            selectedOptions={selectedOptionsForSummary}
            totalHours={totalHours}
          />

          {/* 8. Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || dailyRate <= 0}
            className="w-full"
          >
            {submitting ? t("submitting") : t("submitButton")}
          </Button>
          {dailyRate <= 0 && (
            <p className="text-xs text-amber-600 text-center">
              {t("noDailyRate")}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
