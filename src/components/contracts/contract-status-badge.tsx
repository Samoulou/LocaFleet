import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ContractStatus } from "@/types";

const statusStyles: Record<ContractStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  approved: "bg-blue-50 text-blue-700",
  pending_cg: "bg-amber-50 text-amber-700",
  active: "bg-green-50 text-green-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-50 text-red-700",
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
