import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  pending: {
    label: "En attente",
    dotClass: "bg-slate-500",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  invoiced: {
    label: "Facturé",
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  verification: {
    label: "Vérification",
    dotClass: "bg-yellow-500",
    badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  paid: {
    label: "Payé",
    dotClass: "bg-green-500",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
  },
  conflict: {
    label: "Conflit",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  cancelled: {
    label: "Annulé",
    dotClass: "bg-slate-400",
    badgeClass: "bg-slate-50 text-slate-400 border-slate-200",
  },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = INVOICE_STATUS_CONFIG[status];

  return (
    <Badge variant="outline" className={cn("gap-1.5", config.badgeClass)}>
      <span className={cn("size-2 rounded-full", config.dotClass)} />
      {config.label}
    </Badge>
  );
}
