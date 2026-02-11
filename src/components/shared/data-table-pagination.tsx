"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
}: DataTablePaginationProps) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  // Build page numbers to display (max 5 visible)
  const getPageNumbers = (): number[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) {
      return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
    }
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <p className="text-sm text-slate-500">
        Affichage {start} à {end} sur {totalCount}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Page précédente"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {getPageNumbers().map((pageNum) => (
          <Button
            key={pageNum}
            variant={pageNum === page ? "default" : "outline"}
            size="sm"
            className="min-w-[2rem]"
            onClick={() => onPageChange(pageNum)}
          >
            {pageNum}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Page suivante"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
