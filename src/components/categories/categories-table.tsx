"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { CategoryWithCount } from "@/actions/categories";
import { formatCHF } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CategoryDialog } from "./category-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";

type CategoriesTableProps = {
  categories: CategoryWithCount[];
};

function formatRate(value: string | null): string {
  if (!value) return "—";
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  return formatCHF(num);
}

export function CategoriesTable({ categories }: CategoriesTableProps) {
  const t = useTranslations("settings.categories");
  const tCommon = useTranslations("common");

  const [editCategory, setEditCategory] = useState<CategoryWithCount | null>(
    null
  );
  const [deleteCategory, setDeleteCategory] =
    useState<CategoryWithCount | null>(null);

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("columns.description")}
              </TableHead>
              <TableHead className="text-right">
                {t("columns.dailyRate")}
              </TableHead>
              <TableHead className="text-right hidden sm:table-cell">
                {t("columns.weeklyRate")}
              </TableHead>
              <TableHead className="text-center">
                {t("columns.vehicles")}
              </TableHead>
              <TableHead className="w-[70px]">
                <span className="sr-only">{tCommon("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="hidden md:table-cell text-slate-500">
                  {category.description || "—"}
                </TableCell>
                <TableCell className="text-right">
                  {formatRate(category.dailyRate)}
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell">
                  {formatRate(category.weeklyRate)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{category.vehicleCount}</Badge>
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
                        onClick={() => setEditCategory(category)}
                      >
                        <Pencil className="mr-2 size-4" />
                        {tCommon("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteCategory(category)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        {tCommon("delete")}
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
      <CategoryDialog
        category={editCategory}
        open={!!editCategory}
        onOpenChange={(open) => {
          if (!open) setEditCategory(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteCategoryDialog
        category={deleteCategory}
        open={!!deleteCategory}
        onOpenChange={(open) => {
          if (!open) setDeleteCategory(null);
        }}
      />
    </>
  );
}
