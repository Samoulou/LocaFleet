import { describe, it, expect } from "vitest";
import { getInitials } from "@/components/layout/user-avatar";

describe("getInitials", () => {
  it("extracts two initials from full name", () => {
    expect(getInitials("Marc Favre")).toBe("MF");
  });

  it("extracts single initial from single name", () => {
    expect(getInitials("Alice")).toBe("A");
  });

  it("returns empty string for empty input", () => {
    expect(getInitials("")).toBe("");
  });

  it("uses first and last name for hyphenated names", () => {
    expect(getInitials("Jean-Pierre Dupont")).toBe("JD");
  });

  it("handles names with extra whitespace", () => {
    expect(getInitials("  Anna   Belle  ")).toBe("AB");
  });

  it("handles three-part names", () => {
    expect(getInitials("Marie Claire Dupont")).toBe("MD");
  });
});
