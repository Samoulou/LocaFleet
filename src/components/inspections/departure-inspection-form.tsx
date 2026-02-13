"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { submitDepartureInspectionSchema } from "@/lib/validations/inspection";
import type { SubmitDepartureInspectionData } from "@/lib/validations/inspection";
import {
  createDraftInspection,
  submitDepartureInspection,
  updateDepartureInspection,
} from "@/actions/inspections";
import type { DepartureInspectionDetail } from "@/actions/inspections";
import type { ContractDetail } from "@/actions/get-contract";
import { FuelLevelGauge } from "./fuel-level-gauge";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";
import { DamageEntry } from "./damage-entry";
import { InspectionPhotoUpload } from "./inspection-photo-upload";

// ============================================================================
// Types
// ============================================================================

type DepartureInspectionFormProps = {
  contract: ContractDetail;
  existingInspection: DepartureInspectionDetail | null;
  isEditMode: boolean;
  tenantId: string;
};

type DamageValue = {
  zone: string;
  type: string;
  severity: string;
  description?: string;
  isPreExisting: boolean;
};

type FuelLevelValue = "empty" | "quarter" | "half" | "three_quarter" | "full";

// ============================================================================
// Component
// ============================================================================

export function DepartureInspectionForm({
  contract,
  existingInspection,
  isEditMode,
  tenantId,
}: DepartureInspectionFormProps) {
  const t = useTranslations("inspections.departure");
  const router = useRouter();
  const signatureRef = useRef<SignaturePadHandle>(null);

  const [inspectionId, setInspectionId] = useState<string | null>(
    existingInspection?.id ?? null
  );
  const [draftLoading, setDraftLoading] = useState(!existingInspection);
  const [submitting, setSubmitting] = useState(false);
  const [damages, setDamages] = useState<DamageValue[]>(
    existingInspection?.damages.map((d) => ({
      zone: d.zone,
      type: d.type,
      severity: d.severity,
      description: d.description ?? undefined,
      isPreExisting: d.isPreExisting,
    })) ?? []
  );
  const [fuelLevel, setFuelLevel] = useState<FuelLevelValue>(
    (existingInspection?.fuelLevel as FuelLevelValue) ?? "empty"
  );
  const [exteriorCleanliness, setExteriorCleanliness] = useState<
    "clean" | "dirty"
  >((existingInspection?.exteriorCleanliness as "clean" | "dirty") ?? "clean");
  const [interiorCleanliness, setInteriorCleanliness] = useState<
    "clean" | "dirty"
  >((existingInspection?.interiorCleanliness as "clean" | "dirty") ?? "clean");

  const [mileage, setMileage] = useState(existingInspection?.mileage ?? 0);
  const [agentNotes, setAgentNotes] = useState(
    existingInspection?.agentNotes ?? ""
  );

  // Create draft on mount in create mode
  useEffect(() => {
    if (existingInspection) return;

    let cancelled = false;

    createDraftInspection({ contractId: contract.id }).then((result) => {
      if (cancelled) return;

      if (result.success) {
        setInspectionId(result.data.inspectionId);
      } else {
        toast.error(result.error);
      }
      setDraftLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id]);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!inspectionId) {
      toast.error(t("noDraft"));
      return;
    }

    setSubmitting(true);

    const signatureUrl = signatureRef.current?.getSignatureDataUrl();

    const payload: SubmitDepartureInspectionData = {
      inspectionId,
      contractId: contract.id,
      mileage,
      fuelLevel,
      exteriorCleanliness,
      interiorCleanliness,
      agentNotes: agentNotes || undefined,
      clientSignatureUrl: signatureUrl,
      damages: damages.map((d) => ({
        zone: d.zone as "front",
        type: d.type as "scratch",
        severity: d.severity as "low",
        description: d.description,
        isPreExisting: d.isPreExisting,
      })),
    };

    // Validate with zod first
    const validation = submitDepartureInspectionSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Données invalides");
      setSubmitting(false);
      return;
    }

    const action = isEditMode
      ? updateDepartureInspection
      : submitDepartureInspection;
    const result = await action(payload);

    setSubmitting(false);

    if (result.success) {
      toast.success(isEditMode ? t("updateSuccess") : t("submitSuccess"));
      router.push(`/contracts/${contract.id}`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function addDamage() {
    setDamages((prev) => [
      ...prev,
      {
        zone: "front",
        type: "scratch",
        severity: "low",
        description: "",
        isPreExisting: true,
      },
    ]);
  }

  function updateDamage(index: number, value: DamageValue) {
    setDamages((prev) => prev.map((d, i) => (i === index ? value : d)));
  }

  function removeDamage(index: number) {
    setDamages((prev) => prev.filter((_, i) => i !== index));
  }

  if (draftLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Section 1: Vehicle info + mileage + fuel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="size-4" />
            {t("vehicleSection")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read-only vehicle info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs text-slate-500">{t("brand")}</Label>
              <p className="font-medium text-slate-900">
                {contract.vehicle.brand} {contract.vehicle.model}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">{t("plate")}</Label>
              <p className="font-medium text-slate-900">
                {contract.vehicle.plateNumber}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">{t("client")}</Label>
              <p className="font-medium text-slate-900">
                {contract.client.firstName} {contract.client.lastName}
              </p>
            </div>
          </div>

          {/* Mileage */}
          <div>
            <Label htmlFor="mileage">{t("mileage")}</Label>
            <Input
              id="mileage"
              type="number"
              min={0}
              step={1}
              value={mileage}
              onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
              className="mt-1 max-w-xs"
              placeholder="ex. 45000"
            />
          </div>

          {/* Fuel gauge */}
          <FuelLevelGauge value={fuelLevel} onChange={setFuelLevel} />
        </CardContent>
      </Card>

      {/* Section 2: Photos */}
      {inspectionId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("photosSection")}</CardTitle>
          </CardHeader>
          <CardContent>
            <InspectionPhotoUpload
              inspectionId={inspectionId}
              tenantId={tenantId}
              initialPhotos={existingInspection?.photos ?? []}
            />
          </CardContent>
        </Card>
      )}

      {/* Section 3: Damages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("damagesSection")}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDamage}
            >
              <Plus className="mr-1 size-4" />
              {t("addDamage")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {damages.length === 0 ? (
            <p className="text-sm text-slate-500">{t("noDamages")}</p>
          ) : (
            <div className="space-y-3">
              {damages.map((damage, i) => (
                <DamageEntry
                  key={i}
                  value={damage}
                  onChange={(v) => updateDamage(i, v)}
                  onRemove={() => removeDamage(i)}
                  index={i}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Cleanliness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("cleanlinessSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Exterior */}
          <div className="space-y-2">
            <Label>{t("exteriorCleanliness")}</Label>
            <div className="flex gap-2">
              {(["clean", "dirty"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setExteriorCleanliness(val)}
                  className={cn(
                    "flex h-9 flex-1 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                    exteriorCleanliness === val
                      ? val === "clean"
                        ? "border-green-300 bg-green-100 text-green-700"
                        : "border-red-300 bg-red-100 text-red-700"
                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                  )}
                >
                  {t(`cleanliness.${val}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Interior */}
          <div className="space-y-2">
            <Label>{t("interiorCleanliness")}</Label>
            <div className="flex gap-2">
              {(["clean", "dirty"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setInteriorCleanliness(val)}
                  className={cn(
                    "flex h-9 flex-1 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                    interiorCleanliness === val
                      ? val === "clean"
                        ? "border-green-300 bg-green-100 text-green-700"
                        : "border-red-300 bg-red-100 text-red-700"
                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                  )}
                >
                  {t(`cleanliness.${val}`)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Agent notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("agentNotesSection")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={agentNotes}
            onChange={(e) => setAgentNotes(e.target.value)}
            placeholder={t("agentNotesPlaceholder")}
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Section 6: Client signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("signatureSection")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SignaturePad
            ref={signatureRef}
            existingSignatureUrl={existingInspection?.clientSignatureUrl}
          />
        </CardContent>
      </Card>

      {/* Section 7: Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting || !inspectionId}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("submitting")}
            </>
          ) : isEditMode ? (
            t("updateButton")
          ) : (
            t("submitButton")
          )}
        </Button>
      </div>
    </form>
  );
}
