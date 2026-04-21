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
    className: "bg-slate-100 text-slate-700",
  },
  approved: {
    label: "Approuve",
    className: "bg-blue-50 text-blue-700",
  },
  pending_cg: {
    label: "En attente CG",
    className: "bg-amber-50 text-amber-700",
  },
  active: {
    label: "Actif",
    className: "bg-green-50 text-green-700",
  },
  completed: {
    label: "Termine",
    className: "bg-slate-100 text-slate-700",
  },
  cancelled: {
    label: "Annule",
    className: "bg-red-50 text-red-700",
  },
};

export function ClientContractsHistory({
  contracts,
}: ClientContractsHistoryProps) {
  const t = useTranslations("clients.detail");

  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          {t("contractHistory")}
        </h2>
        <p className="mt-4 text-sm text-slate-500">{t("noContracts")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">
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
                className: "bg-slate-100 text-slate-700",
              };
              return (
                <TableRow key={contract.id}>
                  <TableCell>
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {contract.contractNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {contract.vehicleBrand} {contract.vehicleModel}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
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
