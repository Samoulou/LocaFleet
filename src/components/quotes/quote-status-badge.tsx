import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/types";

const statusStyles: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  accepted: "bg-green-500/10 text-green-600",
  declined: "bg-red-500/10 text-red-500",
  expired: "bg-amber-500/10 text-amber-600",
};

type QuoteStatusBadgeProps = {
  status: QuoteStatus;
  className?: string;
};

export function QuoteStatusBadge({ status, className }: QuoteStatusBadgeProps) {
  const t = useTranslations("quotes.status");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {t(status)}
    </span>
  );
}
