import { describe, it, expect } from "vitest";
import { routing } from "@/i18n/routing";

describe("i18n routing config", () => {
  it("has fr and en as supported locales", () => {
    expect(routing.locales).toEqual(["fr", "en"]);
  });

  it("has fr as the default locale", () => {
    expect(routing.defaultLocale).toBe("fr");
  });
});
