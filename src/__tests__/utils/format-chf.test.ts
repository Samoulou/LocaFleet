import { describe, it, expect } from "vitest";
import {
  formatCHF,
  formatDate,
  formatDateTime,
  computeRentalDays,
} from "@/lib/utils";

describe("formatCHF", () => {
  it("formats positive numbers correctly", () => {
    const result = formatCHF(1234.56);
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("CHF");
  });

  it("formats zero correctly", () => {
    const result = formatCHF(0);
    expect(result).toContain("0");
    expect(result).toContain("CHF");
  });

  it("formats negative numbers correctly", () => {
    const result = formatCHF(-500);
    expect(result).toContain("500");
    expect(result).toContain("CHF");
  });
});

describe("formatDate", () => {
  it("formats Date objects correctly", () => {
    const date = new Date("2024-03-15");
    const result = formatDate(date);
    expect(result).toContain("15");
    expect(result).toContain("03");
    expect(result).toContain("2024");
  });

  it("formats date strings correctly", () => {
    const result = formatDate("2024-12-25");
    expect(result).toContain("25");
    expect(result).toContain("12");
    expect(result).toContain("2024");
  });
});

describe("formatDateTime", () => {
  it("formats Date objects with time in Swiss format", () => {
    const date = new Date("2024-03-15T14:30:00");
    const result = formatDateTime(date);
    expect(result).toContain("15");
    expect(result).toContain("03");
    expect(result).toContain("2024");
    expect(result).toContain("14");
    expect(result).toContain("30");
  });

  it("formats date strings with time", () => {
    const result = formatDateTime("2024-12-25T09:15:00");
    expect(result).toContain("25");
    expect(result).toContain("12");
    expect(result).toContain("2024");
    expect(result).toContain("09");
    expect(result).toContain("15");
  });
});

describe("computeRentalDays", () => {
  it("returns null when endDate is before startDate", () => {
    const start = new Date("2026-04-05T10:00:00");
    const end = new Date("2026-04-01T10:00:00");
    expect(computeRentalDays(start, end)).toBeNull();
  });

  it("returns null when endDate equals startDate", () => {
    const d = new Date("2026-04-01T10:00:00");
    expect(computeRentalDays(d, d)).toBeNull();
  });

  it("exact 24h = 1 billed day", () => {
    const start = new Date("2026-04-01T09:00:00");
    const end = new Date("2026-04-02T09:00:00");
    const result = computeRentalDays(start, end);
    expect(result).toEqual({ totalHours: 24, billedDays: 1 });
  });

  it("56h = 3 billed days", () => {
    const start = new Date("2026-04-01T08:00:00");
    const end = new Date("2026-04-03T16:00:00");
    const result = computeRentalDays(start, end);
    expect(result).toEqual({ totalHours: 56, billedDays: 3 });
  });

  it("1h = 1 billed day", () => {
    const start = new Date("2026-04-01T09:00:00");
    const end = new Date("2026-04-01T10:00:00");
    const result = computeRentalDays(start, end);
    expect(result).toEqual({ totalHours: 1, billedDays: 1 });
  });

  it("25h = 2 billed days", () => {
    const start = new Date("2026-04-01T09:00:00");
    const end = new Date("2026-04-02T10:00:00");
    const result = computeRentalDays(start, end);
    expect(result).toEqual({ totalHours: 25, billedDays: 2 });
  });
});
