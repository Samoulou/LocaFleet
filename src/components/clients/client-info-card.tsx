"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { toggleClientTrusted } from "@/actions/clients";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { ClientDetail } from "@/actions/clients";

type ClientInfoCardProps = {
  client: ClientDetail;
};

export function ClientInfoCard({ client }: ClientInfoCardProps) {
  const t = useTranslations("clients.detail");

  async function handleToggleTrust() {
    const result = await toggleClientTrusted(client.id);
    if (result.success) {
      toast.success(
        result.data.isTrusted
          ? "Client marque comme de confiance"
          : "Client retire des clients de confiance"
      );
    } else {
      toast.error(result.error);
    }
  }

  const fields = [
    { label: t("email"), value: client.email },
    { label: t("phone"), value: client.phone },
    {
      label: t("dateOfBirth"),
      value: client.dateOfBirth ? formatDate(client.dateOfBirth) : null,
    },
    { label: t("address"), value: client.address },
    { label: t("license"), value: client.licenseNumber },
    { label: t("licenseCategory"), value: client.licenseCategory },
    {
      label: t("licenseExpiry"),
      value: client.licenseExpiry ? formatDate(client.licenseExpiry) : null,
    },
    { label: t("identityDocType"), value: client.identityDocType },
    { label: t("identityDocNumber"), value: client.identityDocNumber },
    { label: t("company"), value: client.companyName },
    { label: t("notes"), value: client.notes },
    { label: t("createdAt"), value: formatDate(client.createdAt) },
    { label: t("updatedAt"), value: formatDate(client.updatedAt) },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">{t("info")}</h2>
      <dl className="mt-4 space-y-3">
        {fields.map((field) => (
          <div key={field.label} className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-slate-500">
              {field.label}
            </dt>
            <dd className="text-sm text-slate-900">
              {field.value ?? (
                <span className="text-slate-400">{t("notSpecified")}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {/* Trust toggle */}
      <div className="mt-6 flex items-center gap-3 rounded-lg border border-slate-200 p-4">
        <BadgeCheck
          className={`size-5 ${client.isTrusted ? "text-emerald-600" : "text-slate-400"}`}
        />
        <Label
          htmlFor="trusted-toggle"
          className="flex-1 cursor-pointer text-sm font-medium"
        >
          {t("trustedToggle")}
        </Label>
        <Switch
          id="trusted-toggle"
          checked={client.isTrusted}
          onCheckedChange={handleToggleTrust}
        />
      </div>
    </div>
  );
}
