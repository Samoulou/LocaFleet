"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DAMAGE_ZONES = [
  "front",
  "rear",
  "left_side",
  "right_side",
  "roof",
  "interior",
] as const;

const DAMAGE_TYPES = ["scratch", "dent", "broken", "stain", "other"] as const;

const DAMAGE_SEVERITIES = ["low", "medium", "high"] as const;

type DamageEntryValue = {
  zone: string;
  type: string;
  severity: string;
  description?: string;
  isPreExisting: boolean;
};

type DamageEntryProps = {
  value: DamageEntryValue;
  onChange: (value: DamageEntryValue) => void;
  onRemove: () => void;
  index: number;
  disabled?: boolean;
};

export function DamageEntry({
  value,
  onChange,
  onRemove,
  index,
  disabled,
}: DamageEntryProps) {
  const t = useTranslations("inspections.departure");

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {t("damage")} #{index + 1}
        </span>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-500"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Zone */}
        <Select
          value={value.zone}
          onValueChange={(v) => onChange({ ...value, zone: v })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("zonePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {DAMAGE_ZONES.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {t(`zones.${zone}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type */}
        <Select
          value={value.type}
          onValueChange={(v) => onChange({ ...value, type: v })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("typePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {DAMAGE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Severity */}
        <div className="flex items-center gap-2">
          {DAMAGE_SEVERITIES.map((sev) => (
            <button
              key={sev}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...value, severity: sev })}
              className={cn(
                "flex h-9 flex-1 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                value.severity === sev
                  ? sev === "low"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : sev === "medium"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                      : "border-red-500/30 bg-red-500/10 text-red-500"
                  : "border-border bg-background text-muted-foreground hover:border-border",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {t(`severities.${sev}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <Textarea
        value={value.description ?? ""}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        placeholder={t("damageDescriptionPlaceholder")}
        disabled={disabled}
        rows={2}
        className="resize-none"
      />
    </div>
  );
}
