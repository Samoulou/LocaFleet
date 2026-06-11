"use server";

import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { events, eventComments, eventEmployees, users } from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import { addEventCommentSchema } from "@/lib/validations/events";
import { getZodErrorMessage } from "@/lib/validations/utils";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { CurrentUser } from "@/lib/auth";

// ============================================================================
// Types
// ============================================================================

export type EventCommentItem = {
  id: string;
  body: string;
  createdAt: Date;
  authorUserId: string | null;
  authorName: string | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// Internal helpers
// ============================================================================

/** Event must exist in tenant; employees must additionally be assigned. */
async function canAccessEvent(
  currentUser: CurrentUser,
  eventId: string
): Promise<boolean> {
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(eq(events.id, eventId), eq(events.tenantId, currentUser.tenantId))
    );

  if (!event) return false;

  if (currentUser.role === "employee") {
    const [assignment] = await db
      .select({ id: eventEmployees.id })
      .from(eventEmployees)
      .where(
        and(
          eq(eventEmployees.eventId, eventId),
          eq(eventEmployees.userId, currentUser.id)
        )
      );
    return !!assignment;
  }

  return true;
}

// ============================================================================
// listEventComments
// ============================================================================

export async function listEventComments(
  eventId: string
): Promise<ActionResult<EventCommentItem[]>> {
  try {
    const currentUser = await requirePermission("events", "read");

    if (!UUID_REGEX.test(eventId)) {
      return { success: false, error: "Cet événement n'existe pas" };
    }

    if (!(await canAccessEvent(currentUser, eventId))) {
      return { success: false, error: "Cet événement n'existe pas" };
    }

    const result = await db
      .select({
        id: eventComments.id,
        body: eventComments.body,
        createdAt: eventComments.createdAt,
        authorUserId: eventComments.authorUserId,
        authorName: users.name,
      })
      .from(eventComments)
      .leftJoin(users, eq(eventComments.authorUserId, users.id))
      .where(
        and(
          eq(eventComments.eventId, eventId),
          eq(eventComments.tenantId, currentUser.tenantId)
        )
      )
      .orderBy(asc(eventComments.createdAt));

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "listEventComments error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// addEventComment
// ============================================================================

export async function addEventComment(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    // Base permission is events read; writing rules are role-specific below
    // (employees comment on THEIR events — supplément d'inventaire, heures
    // supplémentaires... — viewers never write).
    const currentUser = await requirePermission("events", "read");

    if (currentUser.role === "viewer") {
      return {
        success: false,
        error: "Votre rôle ne permet pas d'ajouter des commentaires",
      };
    }

    const parsed = addEventCommentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const { eventId, body } = parsed.data;

    if (!(await canAccessEvent(currentUser, eventId))) {
      return { success: false, error: "Cet événement n'existe pas" };
    }

    const [created] = await db
      .insert(eventComments)
      .values({
        tenantId: currentUser.tenantId,
        eventId,
        authorUserId: currentUser.id,
        body,
      })
      .returning({ id: eventComments.id });

    revalidatePath(`/events/${eventId}`);

    return { success: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "addEventComment error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// deleteEventComment — author or admin
// ============================================================================

export async function deleteEventComment(
  commentId: string
): Promise<ActionResult<void>> {
  try {
    const currentUser = await requirePermission("events", "read");

    if (!UUID_REGEX.test(commentId)) {
      return { success: false, error: "Ce commentaire n'existe pas" };
    }

    const [comment] = await db
      .select({
        id: eventComments.id,
        eventId: eventComments.eventId,
        authorUserId: eventComments.authorUserId,
      })
      .from(eventComments)
      .where(
        and(
          eq(eventComments.id, commentId),
          eq(eventComments.tenantId, currentUser.tenantId)
        )
      );

    if (!comment) {
      return { success: false, error: "Ce commentaire n'existe pas" };
    }

    if (
      currentUser.role !== "admin" &&
      comment.authorUserId !== currentUser.id
    ) {
      return {
        success: false,
        error:
          "Seul l'auteur ou un administrateur peut supprimer ce commentaire",
      };
    }

    await db
      .delete(eventComments)
      .where(
        and(
          eq(eventComments.id, commentId),
          eq(eventComments.tenantId, currentUser.tenantId)
        )
      );

    revalidatePath(`/events/${comment.eventId}`);

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "deleteEventComment error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}
