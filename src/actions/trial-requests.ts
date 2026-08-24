"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { db } from "@/db";
import { trialRequests } from "@/db/schema";
import { trialRequestSchema } from "@/lib/validations/trial-request";
import { getZodErrorMessage } from "@/lib/validations/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types";

// ============================================================================
// Helpers
// ============================================================================

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// sendTrialNotificationEmail — internal helper (best-effort, never throws)
// ============================================================================

async function sendTrialNotificationEmail(params: {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  fleetSize: string;
  message?: string;
  locale: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — trial request email skipped");
    return;
  }

  const recipient =
    process.env.TRIAL_NOTIFICATION_EMAIL ?? "sales@locafleet.ch";
  const safeCompany = escapeHtml(params.companyName);
  const safeContact = escapeHtml(params.contactName);
  const safeEmail = escapeHtml(params.email);
  const safePhone = params.phone ? escapeHtml(params.phone) : "—";
  const safeMessage = params.message
    ? escapeHtml(params.message).replace(/\n/g, "<br />")
    : "—";

  const htmlBody = `
    <h2>Nouvelle demande d'essai</h2>
    <p><strong>Entreprise :</strong> ${safeCompany}</p>
    <p><strong>Contact :</strong> ${safeContact}</p>
    <p><strong>Email :</strong> ${safeEmail}</p>
    <p><strong>Téléphone :</strong> ${safePhone}</p>
    <p><strong>Taille de flotte :</strong> ${params.fleetSize} véhicules</p>
    <p><strong>Langue :</strong> ${params.locale}</p>
    <hr />
    <p><strong>Message :</strong></p>
    <p>${safeMessage}</p>
  `;

  const { error } = await getResend().emails.send({
    from: "LocaFleet <noreply@locafleet.ch>",
    to: [recipient],
    subject: `Demande d'essai — ${params.companyName}`,
    html: htmlBody,
  });

  if (error) {
    console.error(
      "Resend trial request email failed:",
      error instanceof Error ? error.message : JSON.stringify(error)
    );
  }
}

// ============================================================================
// submitTrialRequest — PUBLIC action (no auth: landing page form)
// ============================================================================

export async function submitTrialRequest(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = trialRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getZodErrorMessage(parsed.error) };
    }

    const data = parsed.data;

    // Honeypot filled in → silently pretend success (don't tip off bots)
    if (data.website) {
      return { success: true, data: { id: "ok" } };
    }

    // Public endpoint: throttle per IP (5/hour) so floods cannot fill the
    // table or burn Resend quota. Per-process limiter — acceptable for the
    // single-instance deployment, same trade-off as src/lib/rate-limit.ts.
    const requestHeaders = await headers();
    const ip =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      "unknown";
    const rate = checkRateLimit(`trial-request:${ip}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      return {
        success: false,
        error:
          "Trop de demandes depuis cette adresse. Merci de réessayer plus tard.",
      };
    }

    const [created] = await db
      .insert(trialRequests)
      .values({
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone ?? null,
        fleetSize: data.fleetSize,
        message: data.message ?? null,
        locale: data.locale,
      })
      .returning({ id: trialRequests.id });

    // Best-effort notification: lead is already persisted, email failure
    // must not fail the action
    try {
      await sendTrialNotificationEmail({
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        fleetSize: data.fleetSize,
        message: data.message,
        locale: data.locale,
      });
    } catch (emailErr) {
      console.error(
        "sendTrialNotificationEmail error:",
        emailErr instanceof Error ? emailErr.message : "Unknown error"
      );
    }

    return { success: true, data: { id: created.id } };
  } catch (err) {
    console.error(
      "submitTrialRequest error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de l'envoi de votre demande",
    };
  }
}
