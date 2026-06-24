"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import type { UserListItem } from "@/actions/users";
import { toggleUserActive } from "@/actions/users";
import { formatCHF } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserDialog } from "./user-dialog";

type UsersTableProps = {
  users: UserListItem[];
  currentUserId: string;
};

function formatHourlyRate(value: string | null): string {
  if (!value) return "—";
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  return `${formatCHF(num)}/h`;
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const t = useTranslations("settings.users");
  const tRoles = useTranslations("rbac.roles");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggleActive(user: UserListItem) {
    setTogglingId(user.id);
    try {
      const result = await toggleUserActive({
        userId: user.id,
        isActive: !user.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("statusUpdated"));
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("columns.email")}
              </TableHead>
              <TableHead>{t("columns.role")}</TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("columns.phone")}
              </TableHead>
              <TableHead className="hidden sm:table-cell text-right">
                {t("columns.hourlyRate")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("columns.employmentType")}
              </TableHead>
              <TableHead className="text-center">
                {t("columns.status")}
              </TableHead>
              <TableHead className="w-[70px]">
                <span className="sr-only">{tCommon("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className={!user.isActive ? "opacity-60" : undefined}
              >
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{tRoles(user.role)}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {user.phone || "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right">
                  {formatHourlyRate(user.hourlyRate)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {user.employmentType
                    ? t(`employmentTypes.${user.employmentType}`)
                    : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={user.isActive}
                    disabled={
                      user.id === currentUserId || togglingId === user.id
                    }
                    onCheckedChange={() => handleToggleActive(user)}
                    aria-label={t("columns.status")}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">{tCommon("actions")}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditUser(user)}>
                        <Pencil className="mr-2 size-4" />
                        {tCommon("edit")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <UserDialog
        user={editUser}
        currentUserId={currentUserId}
        open={!!editUser}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      />
    </>
  );
}
