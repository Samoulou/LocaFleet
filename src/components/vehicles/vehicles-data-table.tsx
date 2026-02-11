"use client";

import { useMemo } from "react";
import Image from "next/image";
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
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { formatMileage } from "@/lib/utils";
import { Car, MoreHorizontal, Eye } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { VehicleListItem, VehicleListResult } from "@/actions/vehicles";

type VehiclesDataTableProps = {
  data: VehicleListResult;
};

export function VehiclesDataTable({ data }: VehiclesDataTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const columns = useMemo<ColumnDef<VehicleListItem>[]>(
    () => [
      {
        id: "photo",
        header: "Photo",
        size: 64,
        cell: ({ row }) => {
          const vehicle = row.original;
          return vehicle.coverPhotoUrl ? (
            <Image
              src={vehicle.coverPhotoUrl}
              alt={`${vehicle.brand} ${vehicle.model}`}
              width={48}
              height={48}
              className="size-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-lg bg-slate-100">
              <Car className="size-5 text-slate-400" />
            </div>
          );
        },
      },
      {
        id: "brandModel",
        header: "Marque / Modèle",
        accessorFn: (row) => `${row.brand} ${row.model}`,
        cell: ({ row }) => (
          <div className="font-medium">
            {row.original.brand} {row.original.model}
          </div>
        ),
      },
      {
        accessorKey: "plateNumber",
        header: "Immatriculation",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">{getValue<string>()}</span>
        ),
      },
      {
        id: "category",
        header: "Catégorie",
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {row.original.categoryName ?? "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "mileage",
        header: "Km",
        cell: ({ getValue }) => (
          <span className="text-sm">{formatMileage(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ getValue }) => (
          <VehicleStatusBadge status={getValue<VehicleListItem["status"]>()} />
        ),
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
                <Link href={`/vehicles/${row.original.id}`}>
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
    data: data.vehicles,
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
    router.push(`/vehicles?${params.toString()}`);
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
                  onClick={() => router.push(`/vehicles/${row.original.id}`)}
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
                  Aucun véhicule ne correspond aux filtres
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
