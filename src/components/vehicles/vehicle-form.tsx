"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createVehicle, updateVehicle } from "@/actions/vehicles";
import type { VehicleCategoryOption } from "@/actions/vehicles";
import {
  vehicleFormSchema,
  type VehicleFormFieldErrors,
} from "@/lib/validations/vehicle-form";
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

type VehicleFormDefaultValues = {
  brand?: string;
  model?: string;
  plateNumber?: string;
  mileage?: number;
  year?: number | null;
  color?: string | null;
  vin?: string | null;
  categoryId?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  seats?: number | null;
  notes?: string | null;
};

type VehicleFormProps = {
  categories: VehicleCategoryOption[];
  defaultValues?: VehicleFormDefaultValues;
  vehicleId?: string;
};

export function VehicleForm({
  categories,
  defaultValues,
  vehicleId,
}: VehicleFormProps) {
  const t = useTranslations("vehicles.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const isEdit = !!vehicleId;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<VehicleFormFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Controlled state for Select components (radix select needs controlled value)
  const [categoryId, setCategoryId] = useState(defaultValues?.categoryId ?? "");
  const [fuelType, setFuelType] = useState(defaultValues?.fuelType ?? "");
  const [transmission, setTransmission] = useState(
    defaultValues?.transmission ?? ""
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      brand: (formData.get("brand") as string) ?? "",
      model: (formData.get("model") as string) ?? "",
      plateNumber: (formData.get("plateNumber") as string) ?? "",
      mileage: (formData.get("mileage") as string) ?? "",
      year: (formData.get("year") as string) ?? "",
      color: (formData.get("color") as string) ?? "",
      vin: (formData.get("vin") as string) ?? "",
      categoryId,
      fuelType,
      transmission,
      seats: (formData.get("seats") as string) ?? "",
      notes: (formData.get("notes") as string) ?? "",
    };

    // Client-side validation
    const result = vehicleFormSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: VehicleFormFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof VehicleFormFieldErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const payload = isEdit ? { ...data, id: vehicleId } : data;
      const actionResult = isEdit
        ? await updateVehicle(payload)
        : await createVehicle(payload);

      if (!actionResult.success) {
        setGeneralError(actionResult.error);
        return;
      }

      toast.success(isEdit ? t("updateSuccess") : t("createSuccess"));
      router.push("/vehicles");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* Identification Section */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-slate-900">
          {t("sectionIdentification")}
        </legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brand">{t("brand")} *</Label>
            <Input
              id="brand"
              name="brand"
              defaultValue={defaultValues?.brand ?? ""}
              placeholder={t("brandPlaceholder")}
              aria-invalid={!!errors.brand}
              aria-describedby={errors.brand ? "brand-error" : undefined}
            />
            {errors.brand && (
              <p
                id="brand-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.brand}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">{t("model")} *</Label>
            <Input
              id="model"
              name="model"
              defaultValue={defaultValues?.model ?? ""}
              placeholder={t("modelPlaceholder")}
              aria-invalid={!!errors.model}
              aria-describedby={errors.model ? "model-error" : undefined}
            />
            {errors.model && (
              <p
                id="model-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.model}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plateNumber">{t("plateNumber")} *</Label>
            <Input
              id="plateNumber"
              name="plateNumber"
              defaultValue={defaultValues?.plateNumber ?? ""}
              placeholder={t("plateNumberPlaceholder")}
              aria-invalid={!!errors.plateNumber}
              aria-describedby={
                errors.plateNumber ? "plateNumber-error" : undefined
              }
            />
            {errors.plateNumber && (
              <p
                id="plateNumber-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.plateNumber}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vin">{t("vin")}</Label>
            <Input
              id="vin"
              name="vin"
              defaultValue={defaultValues?.vin ?? ""}
              placeholder={t("vinPlaceholder")}
              maxLength={17}
              aria-invalid={!!errors.vin}
              aria-describedby={errors.vin ? "vin-error" : undefined}
            />
            {errors.vin && (
              <p
                id="vin-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.vin}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Details Section */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-slate-900">
          {t("sectionDetails")}
        </legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="year">{t("year")}</Label>
            <Input
              id="year"
              name="year"
              type="number"
              defaultValue={defaultValues?.year ?? ""}
              placeholder={t("yearPlaceholder")}
              aria-invalid={!!errors.year}
              aria-describedby={errors.year ? "year-error" : undefined}
            />
            {errors.year && (
              <p
                id="year-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.year}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">{t("color")}</Label>
            <Input
              id="color"
              name="color"
              defaultValue={defaultValues?.color ?? ""}
              placeholder={t("colorPlaceholder")}
              aria-invalid={!!errors.color}
              aria-describedby={errors.color ? "color-error" : undefined}
            />
            {errors.color && (
              <p
                id="color-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.color}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("categoryId")} *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger
                className="w-full"
                aria-invalid={!!errors.categoryId}
                aria-describedby={
                  errors.categoryId ? "categoryId-error" : undefined
                }
              >
                <SelectValue placeholder={t("categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p
                id="categoryId-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.categoryId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("fuelType")}</Label>
            <Select value={fuelType} onValueChange={setFuelType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("fuelTypePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gasoline">
                  {t("fuelTypes.gasoline")}
                </SelectItem>
                <SelectItem value="diesel">{t("fuelTypes.diesel")}</SelectItem>
                <SelectItem value="electric">
                  {t("fuelTypes.electric")}
                </SelectItem>
                <SelectItem value="hybrid">{t("fuelTypes.hybrid")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("transmission")}</Label>
            <Select value={transmission} onValueChange={setTransmission}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("transmissionPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">
                  {t("transmissions.manual")}
                </SelectItem>
                <SelectItem value="automatic">
                  {t("transmissions.automatic")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seats">{t("seats")}</Label>
            <Input
              id="seats"
              name="seats"
              type="number"
              min={1}
              max={50}
              defaultValue={defaultValues?.seats ?? ""}
              placeholder={t("seatsPlaceholder")}
              aria-invalid={!!errors.seats}
              aria-describedby={errors.seats ? "seats-error" : undefined}
            />
            {errors.seats && (
              <p
                id="seats-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.seats}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Operational Section */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-slate-900">
          {t("sectionOperational")}
        </legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mileage">{t("mileage")} *</Label>
            <Input
              id="mileage"
              name="mileage"
              type="number"
              min={0}
              defaultValue={defaultValues?.mileage ?? ""}
              placeholder={t("mileagePlaceholder")}
              aria-invalid={!!errors.mileage}
              aria-describedby={errors.mileage ? "mileage-error" : undefined}
            />
            {errors.mileage && (
              <p
                id="mileage-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.mileage}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Notes Section */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-slate-900">
          {t("sectionNotes")}
        </legend>
        <div className="space-y-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={defaultValues?.notes ?? ""}
            placeholder={t("notesPlaceholder")}
            rows={4}
            maxLength={2000}
            aria-invalid={!!errors.notes}
            aria-describedby={errors.notes ? "notes-error" : undefined}
          />
          {errors.notes && (
            <p
              id="notes-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.notes}
            </p>
          )}
        </div>
      </fieldset>

      {/* General Error */}
      {generalError && (
        <p className="text-sm text-destructive" role="alert">
          {generalError}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isEdit ? t("updating") : t("creating")}
            </>
          ) : isEdit ? (
            t("updateButton")
          ) : (
            t("createButton")
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/vehicles")}
          disabled={loading}
        >
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  );
}
