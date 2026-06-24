"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import type { FonctionListItem } from "@/actions/fonctions";
import { toggleFonctionActive } from "@/actions/fonctions";
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
import { FonctionDialog } from "./fonction-dialog";

type FonctionsTableProps = {
  fonctions: FonctionListItem[];
};

export function FonctionsTable({ fonctions }: FonctionsTableProps) {
  const t = useTranslations("settings.fonctions");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [editFonction, setEditFonction] = useState<FonctionListItem | null>(
    null
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggleActive(fonction: FonctionListItem) {
    setTogglingId(fonction.id);
    try {
      const result = await toggleFonctionActive({
        id: fonction.id,
        isActive: !fonction.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("toggleSuccess"));
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
                {t("columns.behavior")}
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("columns.defaultTimeUnit")}
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
            {fonctions.map((fonction) => (
              <TableRow
                key={fonction.id}
                className={!fonction.isActive ? "opacity-60" : undefined}
              >
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block size-3 shrink-0 rounded-full border"
                      style={{
                        backgroundColor: fonction.color ?? "#94A3B8",
                      }}
                    />
                    {fonction.name}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="flex flex-wrap gap-1">
                    {fonction.requiresEmployees && (
                      <Badge variant="secondary">
                        {t("badges.requiresEmployees")}
                      </Badge>
                    )}
                    {fonction.allowsContract && (
                      <Badge variant="secondary">
                        {t("badges.allowsContract")}
                      </Badge>
                    )}
                    {!fonction.requiresEmployees &&
                      !fonction.allowsContract &&
                      "—"}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {fonction.defaultTimeUnit
                    ? t(`units.${fonction.defaultTimeUnit}`)
                    : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={fonction.isActive}
                    disabled={togglingId === fonction.id}
                    onCheckedChange={() => handleToggleActive(fonction)}
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
                      <DropdownMenuItem
                        onClick={() => setEditFonction(fonction)}
                      >
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
      <FonctionDialog
        fonction={editFonction}
        open={!!editFonction}
        onOpenChange={(open) => {
          if (!open) setEditFonction(null);
        }}
      />
    </>
  );
}
