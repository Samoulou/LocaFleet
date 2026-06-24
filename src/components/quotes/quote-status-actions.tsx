"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  updateQuoteStatus,
  convertQuoteToEvent,
  deleteQuote,
} from "@/actions/quotes";
import type { QuoteStatus } from "@/types";
import { Button } from "@/components/ui/button";

// Mirrors the server-side state machine (server re-validates anyway)
const NEXT_STATUSES: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ["sent", "accepted", "declined"],
  sent: ["accepted", "declined", "expired"],
  accepted: [],
  declined: [],
  expired: [],
};

type QuoteStatusActionsProps = {
  quoteId: string;
  status: QuoteStatus;
  alreadyConverted: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export function QuoteStatusActions({
  quoteId,
  status,
  alreadyConverted,
  canUpdate,
  canDelete,
}: QuoteStatusActionsProps) {
  const t = useTranslations("quotes");
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function handleTransition(target: QuoteStatus) {
    setPending(target);
    try {
      const result = await updateQuoteStatus({ id: quoteId, status: target });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("detail.statusUpdated"));
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function handleConvert() {
    setPending("convert");
    try {
      const result = await convertQuoteToEvent(quoteId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("detail.converted", { number: result.data.eventNumber }));
      router.push(`/events/${result.data.eventId}`);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function handleDelete() {
    setPending("delete");
    try {
      const result = await deleteQuote(quoteId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("detail.deleted"));
      router.push("/quotes");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (!canUpdate) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {NEXT_STATUSES[status].map((target) => (
        <Button
          key={target}
          size="sm"
          variant={
            target === "declined" || target === "expired"
              ? "outline"
              : "default"
          }
          disabled={pending !== null}
          onClick={() => handleTransition(target)}
        >
          {pending === target && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          {t(`detail.transitions.${target}`)}
        </Button>
      ))}
      {status === "accepted" && !alreadyConverted && (
        <Button size="sm" disabled={pending !== null} onClick={handleConvert}>
          {pending === "convert" ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <CalendarPlus className="mr-2 size-4" />
          )}
          {t("detail.convertToEvent")}
        </Button>
      )}
      {canDelete && status === "draft" && (
        <Button
          size="sm"
          variant="destructive"
          disabled={pending !== null}
          onClick={handleDelete}
        >
          {pending === "delete" ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 size-4" />
          )}
          {t("detail.delete")}
        </Button>
      )}
    </div>
  );
}
