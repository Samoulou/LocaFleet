"use client";

import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  variant?: "default" | "danger" | "warning" | "success";
};

export function StatCard({ label, value, icon: Icon, href, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "bg-card",
    danger: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50",
    warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50",
    success: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/50",
  };

  const iconStyles = {
    default: "text-primary bg-primary/10",
    danger: "text-red-600 bg-red-100 dark:bg-red-900/30",
    warning: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
    success: "text-green-600 bg-green-100 dark:bg-green-900/30",
  };

  const content = (
    <Card className={cn("border transition-shadow hover:shadow-md", variantStyles[variant])}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconStyles[variant])}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
