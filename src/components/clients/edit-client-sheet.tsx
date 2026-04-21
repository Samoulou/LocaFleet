"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient, updateClient } from "@/actions/clients";
import {
  clientFormSchema,
  type ClientFormFieldErrors,
} from "@/lib/validations/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { ClientDetail } from "@/actions/clients";

type EditClientSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: ClientDetail;
  clientId?: string;
};

export function EditClientSheet({
  open,
  onOpenChange,
  defaultValues,
  clientId,
}: EditClientSheetProps) {
  const t = useTranslations("clients.form");
  const tToast = useTranslations("clients.toast");
  const isEdit = !!clientId;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ClientFormFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isTrusted, setIsTrusted] = useState(defaultValues?.isTrusted ?? false);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (open) {
      setErrors({});
      setGeneralError(null);
      setIsTrusted(defaultValues?.isTrusted ?? false);
    }
  }, [open, defaultValues?.isTrusted]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: (formData.get("firstName") as string) ?? "",
      lastName: (formData.get("lastName") as string) ?? "",
      email: (formData.get("email") as string) ?? "",
      phone: (formData.get("phone") as string) ?? "",
      dateOfBirth: (formData.get("dateOfBirth") as string) ?? "",
      address: (formData.get("address") as string) ?? "",
      licenseNumber: (formData.get("licenseNumber") as string) ?? "",
      licenseCategory: (formData.get("licenseCategory") as string) ?? "",
      licenseExpiry: (formData.get("licenseExpiry") as string) ?? "",
      identityDocType: (formData.get("identityDocType") as string) ?? "",
      identityDocNumber: (formData.get("identityDocNumber") as string) ?? "",
      companyName: (formData.get("companyName") as string) ?? "",
      notes: (formData.get("notes") as string) ?? "",
      isTrusted,
    };

    const result = clientFormSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: ClientFormFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ClientFormFieldErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const actionResult = isEdit
        ? await updateClient(clientId, data)
        : await createClient(data);

      if (!actionResult.success) {
        setGeneralError(actionResult.error);
        return;
      }

      toast.success(isEdit ? tToast("updated") : tToast("created"));
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  function renderField(
    name: keyof ClientFormFieldErrors,
    label: string,
    placeholder: string,
    opts?: { required?: boolean; type?: string }
  ) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`sheet-${name}`} className="text-sm">
          {label}
          {opts?.required && " *"}
        </Label>
        <Input
          id={`sheet-${name}`}
          name={name}
          type={opts?.type ?? "text"}
          defaultValue={
            (defaultValues?.[name as keyof ClientDetail] as string) ?? ""
          }
          placeholder={placeholder}
          aria-invalid={!!errors[name]}
        />
        {errors[name] && (
          <p className="text-xs text-destructive">{errors[name]}</p>
        )}
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? t("editTitle") : t("createTitle")}</SheetTitle>
          <SheetDescription>
            {isEdit ? t("editSubtitle") : t("createSubtitle")}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
          {/* Identity */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-900">
              {t("sectionIdentity")}
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {renderField(
                "firstName",
                t("firstName"),
                t("firstNamePlaceholder"),
                { required: true }
              )}
              {renderField(
                "lastName",
                t("lastName"),
                t("lastNamePlaceholder"),
                { required: true }
              )}
            </div>
          </fieldset>

          {/* Contact */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-900">
              {t("sectionContact")}
            </legend>
            {renderField("email", t("email"), t("emailPlaceholder"), {
              required: true,
              type: "email",
            })}
            {renderField("phone", t("phone"), t("phonePlaceholder"), {
              required: true,
              type: "tel",
            })}
            {renderField("dateOfBirth", t("dateOfBirth"), "", {
              type: "date",
            })}
            <div className="space-y-1.5">
              <Label htmlFor="sheet-address" className="text-sm">
                {t("address")}
              </Label>
              <Textarea
                id="sheet-address"
                name="address"
                defaultValue={defaultValues?.address ?? ""}
                placeholder={t("addressPlaceholder")}
                rows={2}
              />
            </div>
          </fieldset>

          {/* Driving License */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-900">
              {t("sectionLicense")}
            </legend>
            {renderField(
              "licenseNumber",
              t("licenseNumber"),
              t("licenseNumberPlaceholder")
            )}
            <div className="grid grid-cols-2 gap-3">
              {renderField(
                "licenseCategory",
                t("licenseCategory"),
                t("licenseCategoryPlaceholder")
              )}
              {renderField("licenseExpiry", t("licenseExpiry"), "", {
                type: "date",
              })}
            </div>
          </fieldset>

          {/* Identity Document */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-900">
              {t("sectionIdentityDoc")}
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {renderField(
                "identityDocType",
                t("identityDocType"),
                t("identityDocTypePlaceholder")
              )}
              {renderField(
                "identityDocNumber",
                t("identityDocNumber"),
                t("identityDocNumberPlaceholder")
              )}
            </div>
          </fieldset>

          {/* Other */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-900">
              {t("sectionOther")}
            </legend>
            {renderField(
              "companyName",
              t("companyName"),
              t("companyNamePlaceholder")
            )}
            <div className="flex items-center gap-3">
              <Switch
                id="sheet-isTrusted"
                checked={isTrusted}
                onCheckedChange={setIsTrusted}
              />
              <Label
                htmlFor="sheet-isTrusted"
                className="cursor-pointer text-sm"
              >
                {t("isTrusted")}
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sheet-notes" className="text-sm">
                {t("notes")}
              </Label>
              <Textarea
                id="sheet-notes"
                name="notes"
                defaultValue={defaultValues?.notes ?? ""}
                placeholder={t("notesPlaceholder")}
                rows={3}
                maxLength={2000}
              />
            </div>
          </fieldset>

          {/* General Error */}
          {generalError && (
            <p className="text-sm text-destructive" role="alert">
              {generalError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
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
      </SheetContent>
    </Sheet>
  );
}
