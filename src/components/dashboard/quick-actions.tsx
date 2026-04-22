"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, UserPlus, Car, ClipboardCheck } from "lucide-react";

export function QuickActions() {
  const t = useTranslations("dashboard.quickActions");

  const actions = [
    {
      label: t("newContract"),
      href: "/contracts",
      icon: FileText,
      variant: "default" as const,
    },
    {
      label: t("newClient"),
      href: "/clients",
      icon: UserPlus,
      variant: "outline" as const,
    },
    {
      label: t("newVehicle"),
      href: "/vehicles/new",
      icon: Car,
      variant: "outline" as const,
    },
    {
      label: t("inspection"),
      href: "/contracts",
      icon: ClipboardCheck,
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              className="h-auto flex-col gap-2 py-4"
              asChild
            >
              <Link href={action.href}>
                <action.icon className="size-5" />
                <span className="text-xs">{action.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
