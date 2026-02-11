"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { quickCreateClientSchema } from "@/lib/validations/clients";
import { quickCreateClient } from "@/actions/clients";
import type { ClientSelectItem } from "@/actions/contracts";

type QuickCreateClientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: ClientSelectItem) => void;
};

export function QuickCreateClientDialog({
  open,
  onOpenChange,
  onClientCreated,
}: QuickCreateClientDialogProps) {
  const t = useTranslations("contracts.create.quickCreateClient");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [isTrusted, setIsTrusted] = useState(false);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setLicenseNumber("");
    setIsTrusted(false);
    setErrors({});
  }

  function handleOpenChange(isOpen: boolean) {
    onOpenChange(isOpen);
    if (!isOpen) {
      resetForm();
    }
  }

  async function handleSubmit() {
    setErrors({});

    const formData = {
      firstName,
      lastName,
      phone,
      email,
      licenseNumber,
      isTrusted,
    };

    // Client-side validation
    const validation = quickCreateClientSchema.safeParse(formData);
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
    const result = await quickCreateClient(formData);
    setSubmitting(false);

    if (result.success) {
      toast.success(t("success"));
      onClientCreated(result.data);
      resetForm();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("firstName")}</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("firstName")}
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("lastName")}</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("lastName")}
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("phone")}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+41 79 123 45 67"
            />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.ch"
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("licenseNumber")}</Label>
            <Input
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="G 12345678"
            />
            {errors.licenseNumber && (
              <p className="text-xs text-red-500">{errors.licenseNumber}</p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={isTrusted}
              onCheckedChange={(checked) => setIsTrusted(checked === true)}
            />
            <span className="text-sm text-slate-700">{t("isTrusted")}</span>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
