import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as CHF currency
 */
export function formatCHF(amount: number): string {
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: "CHF",
  }).format(amount);
}

/**
 * Format mileage in Swiss format (apostrophe thousands separator)
 * e.g. 45230 → "45'230 km"
 */
export function formatMileage(km: number): string {
  return (
    new Intl.NumberFormat("de-CH", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(km) + " km"
  );
}

/**
 * Format a date in Swiss format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Format a date with time in Swiss format: DD.MM.YYYY HH:MM
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Compute rental duration from start/end dates.
 * Each started 24-hour period = 1 billed day.
 * Returns null if dates are invalid or end <= start.
 */
export function computeRentalDays(
  startDate: Date,
  endDate: Date
): { totalHours: number; billedDays: number } | null {
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return null;

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const billedDays = Math.ceil(totalHours / 24);

  return { totalHours, billedDays };
}
