import { describe, it, expect } from "vitest";
import { formatCHF, formatDate } from "@/lib/utils";

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
