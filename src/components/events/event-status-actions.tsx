"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { updateEventStatus, deleteEvent } from "@/actions/events";
import type { EventStatus } from "@/types";
import { Button } from "@/components/ui/button";

// Mirrors the server-side state machine (server re-validates anyway)
const NEXT_STATUSES: Record<EventStatus, readonly EventStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const STATUS_VARIANTS: Partial<
  Record<EventStatus, "default" | "outline" | "destructive">
> = {
  confirmed: "default",
  in_progress: "default",
  completed: "default",
  cancelled: "outline",
};

type EventStatusActionsProps = {
  eventId: string;
  status: EventStatus;
  canUpdate: boolean;
  canDelete: boolean;
};

export function EventStatusActions({
  eventId,
  status,
  canUpdate,
  canDelete,
}: EventStatusActionsProps) {
  const t = useTranslations("events");
  const router = useRouter();
  const [pending, setPending] = useState<EventStatus | "delete" | null>(null);

  async function handleTransition(target: EventStatus) {
    setPending(target);
    try {
      const result = await updateEventStatus({ id: eventId, status: target });
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

  async function handleDelete() {
    setPending("delete");
    try {
      const result = await deleteEvent(eventId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("detail.deleted"));
      router.push("/events");
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
          variant={STATUS_VARIANTS[target] ?? "outline"}
          disabled={pending !== null}
          onClick={() => handleTransition(target)}
        >
          {pending === target && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          {t(`detail.transitions.${target}`)}
        </Button>
      ))}
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
