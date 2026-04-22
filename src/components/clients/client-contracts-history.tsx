"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate, formatCHF } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContractSummary } from "@/actions/clients";

type ClientContractsHistoryProps = {
  contracts: ContractSummary[];
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Brouillon",
    className: "bg-muted text-foreground",
  },
  approved: {
    label: "Approuve",
    className: "bg-primary/10 text-primary",
  },
  pending_cg: {
    label: "En attente CG",
    className: "bg-amber-500/10 text-amber-500",
  },
  active: {
    label: "Actif",
    className: "bg-green-500/10 text-green-500",
  },
  completed: {
    label: "Termine",
    className: "bg-muted text-foreground",
  },
  cancelled: {
    label: "Annule",
    className: "bg-red-500/10 text-red-500",
  },
};

export function ClientContractsHistory({
  contracts,
}: ClientContractsHistoryProps) {
  const t = useTranslations("clients.detail");

  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-background p-6">
        <h2 className="text-lg font-semibold text-foreground">
          {t("contractHistory")}
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">{t("noContracts")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-6">
      <h2 className="text-lg font-semibold text-foreground">
        {t("contractHistory")}
      </h2>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("contractNumber")}</TableHead>
              <TableHead>{t("vehicle")}</TableHead>
              <TableHead>{t("period")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => {
              const statusConfig = STATUS_CONFIG[contract.status] ?? {
                label: contract.status,
                className: "bg-muted text-foreground",
              };
              return (
                <TableRow key={contract.id}>
                  <TableCell>
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {contract.contractNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {contract.vehicleBrand} {contract.vehicleModel}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(contract.startDate)} &rarr;{" "}
                    {formatDate(contract.endDate)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}
                    >
                      {statusConfig.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCHF(parseFloat(contract.totalAmount))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
