"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog";
import { EditClientSheet } from "@/components/clients/edit-client-sheet";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { formatDate } from "@/lib/utils";
import { MoreHorizontal, Eye, Pencil, BadgeCheck, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { toggleClientTrusted, getClient } from "@/actions/clients";
import type {
  ClientListResult,
  ClientListItem,
  ClientDetail,
} from "@/actions/clients";

type ClientsDataTableProps = {
  data: ClientListResult;
};

export function ClientsDataTable({ data }: ClientsDataTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("clients");
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [deleteClientName, setDeleteClientName] = useState("");
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editClientData, setEditClientData] = useState<
    ClientDetail | undefined
  >();
  const [editClientId, setEditClientId] = useState<string | undefined>();

  const handleToggleTrust = useCallback(
    async (clientId: string) => {
      const result = await toggleClientTrusted(clientId);
      if (result.success) {
        toast.success(
          result.data.isTrusted ? t("toast.trustedOn") : t("toast.trustedOff")
        );
      } else {
        toast.error(result.error);
      }
    },
    [t]
  );

  const handleEditClient = useCallback(async (clientId: string) => {
    const result = await getClient(clientId);
    if (result.success) {
      setEditClientData(result.data);
      setEditClientId(clientId);
      setEditSheetOpen(true);
    } else {
      toast.error(result.error);
    }
  }, []);

  const columns = useMemo<ColumnDef<ClientListItem>[]>(
    () => [
      {
        id: "name",
        header: t("columns.name"),
        accessorFn: (row) => `${row.lastName} ${row.firstName}`,
        cell: ({ row }) => {
          const client = row.original;
          return (
            <div className="flex items-center gap-3">
              <ClientAvatar
                firstName={client.firstName}
                lastName={client.lastName}
                size="sm"
              />
              <Link
                href={`/clients/${client.id}`}
                className="font-medium text-slate-900 hover:text-blue-600"
                onClick={(e) => e.stopPropagation()}
              >
                {client.lastName} {client.firstName}
              </Link>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: t("columns.email"),
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-600">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "phone",
        header: t("columns.phone"),
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-600">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "licenseNumber",
        header: t("columns.license"),
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-600">
            {getValue<string | null>() ?? "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "isTrusted",
        header: t("columns.trusted"),
        cell: ({ getValue }) =>
          getValue<boolean>() ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <BadgeCheck className="size-3" />
              {t("badges.trusted")}
            </span>
          ) : null,
      },
      {
        accessorKey: "contractCount",
        header: t("columns.contracts"),
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-600">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("columns.createdAt"),
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-600">
            {formatDate(getValue<Date>())}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 48,
        cell: ({ row }) => {
          const client = row.original;
          return (
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
                  <Link href={`/clients/${client.id}`}>
                    <Eye className="mr-2 size-4" />
                    {t("actions.view")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClient(client.id);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  {t("actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleTrust(client.id);
                  }}
                >
                  <BadgeCheck className="mr-2 size-4" />
                  {t("actions.toggleTrust")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteClientId(client.id);
                    setDeleteClientName(
                      `${client.firstName} ${client.lastName}`
                    );
                  }}
                >
                  <Trash2 className="mr-2 size-4" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, handleToggleTrust, handleEditClient]
  );

  const table = useReactTable({
    data: data.clients,
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
    router.push(`/clients?${params.toString()}`);
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
                  onClick={() => router.push(`/clients/${row.original.id}`)}
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
                  {t("noResults")}
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

      <DeleteClientDialog
        clientId={deleteClientId}
        clientName={deleteClientName}
        open={!!deleteClientId}
        onOpenChange={(open) => {
          if (!open) setDeleteClientId(null);
        }}
      />

      <EditClientSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        defaultValues={editClientData}
        clientId={editClientId}
      />
    </div>
  );
}
