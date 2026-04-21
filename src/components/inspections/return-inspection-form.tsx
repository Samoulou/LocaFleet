"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Car, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { submitReturnInspectionSchema } from "@/lib/validations/inspection";
import type { SubmitReturnInspectionData } from "@/lib/validations/inspection";
import {
  createReturnDraftInspection,
  submitReturnInspection,
  updateReturnInspection,
} from "@/actions/inspections";
import type {
  ReturnInspectionDetail,
  InspectionDamageDetail,
} from "@/actions/inspections";
import type { ContractDetail } from "@/actions/get-contract";
import { FuelLevelGauge } from "./fuel-level-gauge";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";
import { DamageEntry } from "./damage-entry";
import { InspectionPhotoUpload } from "./inspection-photo-upload";

// ============================================================================
// Types
// ============================================================================

type ReturnInspectionFormProps = {
  contract: ContractDetail;
  existingInspection: ReturnInspectionDetail | null;
  isEditMode: boolean;
  tenantId: string;
  departureMileage: number;
  departureDamages: InspectionDamageDetail[];
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

export function ReturnInspectionForm({
  contract,
  existingInspection,
  isEditMode,
  tenantId,
  departureMileage,
  departureDamages,
}: ReturnInspectionFormProps) {
  const t = useTranslations("inspections.return");
  const tDeparture = useTranslations("inspections.departure");
  const router = useRouter();
  const signatureRef = useRef<SignaturePadHandle>(null);

  const [inspectionId, setInspectionId] = useState<string | null>(
    existingInspection?.id ?? null
  );
  const [draftLoading, setDraftLoading] = useState(!existingInspection);
  const [submitting, setSubmitting] = useState(false);
  const [signatureEmpty, setSignatureEmpty] = useState(
    !existingInspection?.clientSignatureUrl
  );
  const [signatureError, setSignatureError] = useState(false);

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

  const [mileage, setMileage] = useState(
    existingInspection?.mileage ?? departureMileage
  );
  const [agentNotes, setAgentNotes] = useState(
    existingInspection?.agentNotes ?? ""
  );
  const [mechanicRemarks, setMechanicRemarks] = useState(
    existingInspection?.mechanicRemarks ?? ""
  );

  // Computed: km difference
  const kmDifference =
    mileage > departureMileage ? mileage - departureMileage : 0;

  // Create draft on mount in create mode
  useEffect(() => {
    if (existingInspection) return;

    let cancelled = false;

    createReturnDraftInspection(contract.id).then((result) => {
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

    // Signature is required for return
    const signatureUrl = signatureRef.current?.getSignatureDataUrl();
    if (!signatureUrl) {
      setSignatureError(true);
      toast.error(t("signatureRequired"));
      return;
    }

    setSubmitting(true);
    setSignatureError(false);

    const payload: SubmitReturnInspectionData = {
      inspectionId,
      contractId: contract.id,
      mileage,
      departureMileage,
      fuelLevel,
      exteriorCleanliness,
      interiorCleanliness,
      agentNotes: agentNotes || undefined,
      mechanicRemarks: mechanicRemarks || undefined,
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
    const validation = submitReturnInspectionSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Donnees invalides");
      setSubmitting(false);
      return;
    }

    const action = isEditMode ? updateReturnInspection : submitReturnInspection;
    const result = await action(payload);

    setSubmitting(false);

    if (result.success) {
      if (result.data.warning) {
        toast.warning(result.data.warning);
      } else {
        toast.success(isEditMode ? t("updateSuccess") : t("submitSuccess"));
      }
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
        isPreExisting: false,
      },
    ]);
  }

  function updateDamage(index: number, value: DamageValue) {
    setDamages((prev) => prev.map((d, i) => (i === index ? value : d)));
  }

  function removeDamage(index: number) {
    setDamages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSignatureChange(isEmpty: boolean) {
    setSignatureEmpty(isEmpty);
    if (!isEmpty) {
      setSignatureError(false);
    }
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
      {/* Section 1: Vehicle info + km departure (read-only) + km return + fuel */}
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
              <Label className="text-xs text-slate-500">
                {tDeparture("brand")}
              </Label>
              <p className="font-medium text-slate-900">
                {contract.vehicle.brand} {contract.vehicle.model}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">
                {tDeparture("plate")}
              </Label>
              <p className="font-medium text-slate-900">
                {contract.vehicle.plateNumber}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">
                {tDeparture("client")}
              </Label>
              <p className="font-medium text-slate-900">
                {contract.client.firstName} {contract.client.lastName}
              </p>
            </div>
          </div>

          {/* Km departure (read-only) + km return (editable) + difference */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs text-slate-500">
                {t("departureMileage")}
              </Label>
              <p className="mt-1 font-medium text-slate-900">
                {departureMileage.toLocaleString("de-CH")} km
              </p>
            </div>
            <div>
              <Label htmlFor="mileage">{t("returnMileage")}</Label>
              <Input
                id="mileage"
                type="number"
                min={departureMileage}
                step={1}
                value={mileage}
                onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
                className="mt-1"
                placeholder={`ex. ${departureMileage + 500}`}
              />
            </div>
            <div className="flex items-end" aria-live="polite">
              {kmDifference > 0 && (
                <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                  + {kmDifference.toLocaleString("de-CH")} km
                </span>
              )}
            </div>
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
          <CardTitle className="text-base">{t("damagesSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Departure damages (read-only) */}
          {departureDamages.length > 0 && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Lock className="size-3.5 text-slate-400" />
                <span className="text-sm font-medium text-slate-500">
                  {t("departureDamagesLabel")}
                </span>
                <Badge
                  variant="outline"
                  className="bg-slate-100 text-xs text-slate-600"
                >
                  {t("readOnly")}
                </Badge>
              </div>
              <div className="space-y-3">
                {departureDamages.map((damage, index) => (
                  <DamageEntry
                    key={damage.id}
                    value={{
                      zone: damage.zone,
                      type: damage.type,
                      severity: damage.severity,
                      description: damage.description ?? undefined,
                      isPreExisting: damage.isPreExisting,
                    }}
                    onChange={() => {}}
                    onRemove={() => {}}
                    index={index}
                    disabled
                  />
                ))}
              </div>
            </div>
          )}

          {/* New damages (editable) */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {t("newDamagesLabel")}
                </span>
                {damages.length > 0 && (
                  <Badge className="bg-amber-50 text-xs text-amber-700">
                    {t("newBadge")}
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDamage}
              >
                <Plus className="mr-1 size-4" />
                {tDeparture("addDamage")}
              </Button>
            </div>

            {damages.length === 0 ? (
              <p className="text-sm text-slate-500">{t("noNewDamages")}</p>
            ) : (
              <div className="space-y-3">
                {damages.map((damage, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-amber-200 bg-white"
                  >
                    <DamageEntry
                      value={damage}
                      onChange={(v) => updateDamage(i, v)}
                      onRemove={() => removeDamage(i)}
                      index={i}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Cleanliness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tDeparture("cleanlinessSection")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Exterior */}
          <div className="space-y-2">
            <Label>{tDeparture("exteriorCleanliness")}</Label>
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
                  {tDeparture(`cleanliness.${val}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Interior */}
          <div className="space-y-2">
            <Label>{tDeparture("interiorCleanliness")}</Label>
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
                  {tDeparture(`cleanliness.${val}`)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Agent notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tDeparture("agentNotesSection")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={agentNotes}
            onChange={(e) => setAgentNotes(e.target.value)}
            placeholder={tDeparture("agentNotesPlaceholder")}
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Section 6: Mechanic remarks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("mechanicRemarksSection")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={mechanicRemarks}
            onChange={(e) => setMechanicRemarks(e.target.value)}
            placeholder={t("mechanicRemarksPlaceholder")}
            rows={4}
            className="resize-none"
          />
          {mechanicRemarks.trim().length > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-2 animate-in fade-in rounded-md border border-blue-200 bg-blue-50 p-3"
            >
              <Mail className="mt-0.5 size-4 shrink-0 text-blue-700" />
              <p className="text-sm text-blue-700">
                {t("mechanicEmailCallout")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 7: Client signature (REQUIRED) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tDeparture("signatureSection")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <SignaturePad
            ref={signatureRef}
            existingSignatureUrl={existingInspection?.clientSignatureUrl}
            required
            error={signatureError}
            onSignatureChange={handleSignatureChange}
          />
          {signatureError && (
            <p className="text-sm text-red-500">{t("signatureRequired")}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Submit buttons */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/contracts/${contract.id}`)}
        >
          {t("cancelButton")}
        </Button>
        <Button
          type="submit"
          disabled={submitting || !inspectionId || signatureEmpty}
        >
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
