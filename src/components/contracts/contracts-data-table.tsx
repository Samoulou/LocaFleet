"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ContractStatusBadge } from "@/components/contracts/contract-status-badge";
import { formatCHF } from "@/lib/utils";
import type { ContractListResult } from "@/actions/contracts";

type ContractsDataTableProps = {
  data: ContractListResult;
};

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function ContractsDataTable({ data }: ContractsDataTableProps) {
  const t = useTranslations("contracts.list");

  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">
                {t("contractNumber")}
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                {t("client")}
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                {t("vehicle")}
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                {t("period")}
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                {t("amount")}
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                {t("status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.contracts.map((contract) => (
              <tr
                key={contract.id}
                className="border-b last:border-0 hover:bg-muted"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="font-medium text-primary hover:text-primary/80 hover:underline"
                  >
                    {contract.contractNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {contract.clientFirstName} {contract.clientLastName}
                </td>
                <td className="px-4 py-3 text-foreground">
                  <div>
                    {contract.vehicleBrand} {contract.vehicleModel}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {contract.vehiclePlateNumber}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div>{formatDate(contract.startDate)}</div>
                  <div className="text-xs text-muted-foreground">
                    → {formatDate(contract.endDate)} ({contract.totalDays}j)
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {formatCHF(parseFloat(contract.totalAmount))}
                </td>
                <td className="px-4 py-3">
                  <ContractStatusBadge status={contract.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            {t("showing", {
              from: (data.page - 1) * data.pageSize + 1,
              to: Math.min(data.page * data.pageSize, data.totalCount),
              total: data.totalCount,
            })}
          </span>
        </div>
      )}
    </div>
  );
}
