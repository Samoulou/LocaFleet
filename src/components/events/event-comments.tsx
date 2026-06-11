"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  addEventComment,
  deleteEventComment,
  type EventCommentItem,
} from "@/actions/event-comments";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type EventCommentsProps = {
  eventId: string;
  comments: EventCommentItem[];
  currentUserId: string;
  isAdmin: boolean;
  canComment: boolean;
};

export function EventComments({
  eventId,
  comments,
  currentUserId,
  isAdmin,
  canComment,
}: EventCommentsProps) {
  const t = useTranslations("events.comments");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const result = await addEventComment({ eventId, body: body.trim() });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setBody("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    try {
      const result = await deleteEventComment(commentId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="size-4" />
        {t("title")} ({comments.length})
      </h2>

      <div className="mt-4 space-y-4">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-md bg-muted/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {comment.authorName ?? t("unknownAuthor")}
                </span>{" "}
                — {formatDateTime(comment.createdAt)}
              </p>
              {(isAdmin || comment.authorUserId === currentUserId) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-destructive"
                  disabled={deletingId === comment.id}
                  onClick={() => handleDelete(comment.id)}
                >
                  {deletingId === comment.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  <span className="sr-only">{t("delete")}</span>
                </Button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {comment.body}
            </p>
          </div>
        ))}
      </div>

      {canComment && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("placeholder")}
            rows={2}
            maxLength={2000}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !body.trim()}
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              {t("submit")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
