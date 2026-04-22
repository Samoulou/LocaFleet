import type { ZodError } from "zod";

/**
 * Format all Zod validation issues into a single readable string.
 * Returns bullet-separated messages so users see every invalid field at once.
 */
export function getZodErrorMessage(
  error: ZodError,
  fallback = "Données invalides"
): string {
  const messages = error.issues.map((issue) => issue.message);
  if (messages.length === 0) return fallback;
  if (messages.length === 1) return messages[0];
  return messages.join(" • ");
}
