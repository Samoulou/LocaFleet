"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { submitTrialRequest } from "@/actions/trial-requests";
import {
  trialRequestSchema,
  FLEET_SIZES,
  type TrialRequestFieldErrors,
} from "@/lib/validations/trial-request";
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

export function TrialForm() {
  const t = useTranslations("landing.trial");
  const locale = useLocale();

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fleetSize, setFleetSize] = useState<string>("");
  const [errors, setErrors] = useState<TrialRequestFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      companyName: (formData.get("companyName") as string) ?? "",
      contactName: (formData.get("contactName") as string) ?? "",
      email: (formData.get("email") as string) ?? "",
      phone: (formData.get("phone") as string) ?? "",
      fleetSize,
      message: (formData.get("message") as string) ?? "",
      locale,
      website: (formData.get("website") as string) ?? "",
    };

    const result = trialRequestSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: TrialRequestFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof TrialRequestFieldErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await submitTrialRequest(result.data);
      if (response.success) {
        setSubmitted(true);
      } else {
        setGeneralError(response.error);
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center shadow-sm animate-landing-fade-up"
        role="status"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-8" />
        </span>
        <h3 className="text-xl font-semibold text-card-foreground">
          {t("successTitle")}
        </h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("successMessage")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="companyName">{t("companyName")}</Label>
          <Input
            id="companyName"
            name="companyName"
            autoComplete="organization"
            placeholder={t("companyNamePlaceholder")}
            aria-invalid={!!errors.companyName}
            aria-describedby={
              errors.companyName ? "companyName-error" : undefined
            }
          />
          {errors.companyName && (
            <p
              id="companyName-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.companyName}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName">{t("contactName")}</Label>
          <Input
            id="contactName"
            name="contactName"
            autoComplete="name"
            placeholder={t("contactNamePlaceholder")}
            aria-invalid={!!errors.contactName}
            aria-describedby={
              errors.contactName ? "contactName-error" : undefined
            }
          />
          {errors.contactName && (
            <p
              id="contactName-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.contactName}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p
              id="email-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder={t("phonePlaceholder")}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && (
            <p
              id="phone-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fleetSize">{t("fleetSize")}</Label>
        <Select value={fleetSize} onValueChange={setFleetSize}>
          <SelectTrigger
            id="fleetSize"
            className="w-full"
            aria-invalid={!!errors.fleetSize}
            aria-describedby={errors.fleetSize ? "fleetSize-error" : undefined}
          >
            <SelectValue placeholder={t("fleetSizePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {FLEET_SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {size} {t("fleetSizeSuffix")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.fleetSize && (
          <p
            id="fleetSize-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.fleetSize}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">{t("message")}</Label>
        <Textarea
          id="message"
          name="message"
          rows={3}
          placeholder={t("messagePlaceholder")}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
        {errors.message && (
          <p
            id="message-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.message}
          </p>
        )}
      </div>

      {/* Honeypot — invisible to humans, bots fill it in */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      {generalError && (
        <p className="text-sm text-destructive" role="alert">
          {generalError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          <>
            <Send className="size-4" />
            {t("submit")}
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {t("privacy")}
      </p>
    </form>
  );
}
