import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@/types";

const statusStyles: Record<EventStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/10 text-primary",
  in_progress: "bg-amber-500/10 text-amber-600",
  completed: "bg-green-500/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-500",
};

type EventStatusBadgeProps = {
  status: EventStatus;
  className?: string;
};

export function EventStatusBadge({ status, className }: EventStatusBadgeProps) {
  const t = useTranslations("events.status");

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
