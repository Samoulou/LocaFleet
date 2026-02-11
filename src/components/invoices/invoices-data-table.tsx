"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { formatCHF, formatDate } from "@/lib/utils";
import { MoreHorizontal, Eye } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { InvoiceListItem, InvoiceListResult } from "@/actions/invoices";

type InvoicesDataTableProps = {
  data: InvoiceListResult;
};

export function InvoicesDataTable({ data }: InvoicesDataTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const columns = useMemo<ColumnDef<InvoiceListItem>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "N° facture",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm font-medium">
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: "client",
        header: "Client",
        cell: ({ row }) => {
          const { clientFirstName, clientLastName } = row.original;
          return (
            <span className="truncate text-sm">
              {clientFirstName} {clientLastName}
            </span>
          );
        },
      },
      {
        id: "vehicle",
        header: "Véhicule",
        cell: ({ row }) => {
          const { vehicleBrand, vehicleModel, vehiclePlateNumber } =
            row.original;
          if (!vehicleBrand) {
            return <span className="text-sm text-slate-400">&mdash;</span>;
          }
          return (
            <div className="text-sm">
              <span>
                {vehicleBrand} {vehicleModel}
              </span>
              {vehiclePlateNumber && (
                <span className="ml-1 text-slate-500">
                  ({vehiclePlateNumber})
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "totalAmount",
        header: "Montant",
        cell: ({ getValue }) => (
          <span className="text-sm font-medium">
            {formatCHF(parseFloat(getValue<string>()))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ getValue }) => (
          <InvoiceStatusBadge status={getValue<InvoiceListItem["status"]>()} />
        ),
      },
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => {
          const date = row.original.issuedAt ?? row.original.createdAt;
          return <span className="text-sm">{formatDate(date)}</span>;
        },
      },
      {
        id: "actions",
        header: "",
        size: 48,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/invoices/${row.original.id}`}>
                  <Eye className="mr-2 size-4" />
                  Voir les détails
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: data.invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data.totalPages,
    state: {
      pagination: {
        pageIndex: data.page - 1,
        pageSize: data.pageSize,
      },
    },
  });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/invoices?${params.toString()}`);
  };

  return (
    <div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/invoices/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-slate-500"
                >
                  Aucune facture ne correspond aux filtres
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data.totalPages > 1 && (
        <DataTablePagination
          page={data.page}
          pageSize={data.pageSize}
          totalCount={data.totalCount}
          totalPages={data.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
