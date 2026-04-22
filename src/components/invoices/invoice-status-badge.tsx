import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  pending: {
    label: "En attente",
    dotClass: "bg-muted-foreground",
    badgeClass: "bg-muted text-foreground border-border",
  },
  invoiced: {
    label: "Facturé",
    dotClass: "bg-primary/100",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  verification: {
    label: "Vérification",
    dotClass: "bg-yellow-500",
    badgeClass: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  },
  paid: {
    label: "Payé",
    dotClass: "bg-green-500",
    badgeClass: "bg-green-500/10 text-green-500 border-green-500/30",
  },
  conflict: {
    label: "Conflit",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-500/10 text-red-500 border-red-500/30",
  },
  cancelled: {
    label: "Annulé",
    dotClass: "bg-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
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
