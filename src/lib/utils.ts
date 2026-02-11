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
