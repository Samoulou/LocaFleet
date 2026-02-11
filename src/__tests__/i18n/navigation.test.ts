import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: () => null,
    redirect: vi.fn(),
    usePathname: vi.fn(() => "/"),
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  }),
}));

import * as navigation from "@/i18n/navigation";

describe("i18n navigation utilities", () => {
  it("exports Link component", () => {
    expect(navigation.Link).toBeDefined();
  });

  it("exports redirect function", () => {
    expect(navigation.redirect).toBeDefined();
    expect(typeof navigation.redirect).toBe("function");
  });

  it("exports usePathname hook", () => {
    expect(navigation.usePathname).toBeDefined();
    expect(typeof navigation.usePathname).toBe("function");
  });

  it("exports useRouter hook", () => {
    expect(navigation.useRouter).toBeDefined();
    expect(typeof navigation.useRouter).toBe("function");
  });
});
