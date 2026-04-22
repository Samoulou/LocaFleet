import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ContractStatus } from "@/types";

const statusStyles: Record<ContractStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-primary/10 text-primary",
  pending_cg: "bg-amber-500/10 text-amber-500",
  active: "bg-green-500/10 text-green-500",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-500/10 text-red-500",
};

type ContractStatusBadgeProps = {
  status: ContractStatus;
  className?: string;
};

export function ContractStatusBadge({
  status,
  className,
}: ContractStatusBadgeProps) {
  const t = useTranslations("contracts.status");

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
