import { describe, it, expect } from "vitest";
import {
  NAV_SECTIONS,
  getVisibleNavItems,
} from "@/components/layout/nav-config";

const allItems = NAV_SECTIONS.flatMap((s) => s.items);

describe("nav-config", () => {
  it("every item has key, href, and icon", () => {
    for (const item of allItems) {
      expect(item.key).toBeTruthy();
      expect(item.href).toBeTruthy();
      expect(item.icon).toBeDefined();
    }
  });

  it("all hrefs start with /", () => {
    for (const item of allItems) {
      expect(item.href).toMatch(/^\//);
    }
  });

  it("no duplicate hrefs", () => {
    const hrefs = allItems.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("settings has adminOnly: true", () => {
    const settings = allItems.find((i) => i.key === "settings");
    expect(settings).toBeDefined();
    expect(settings!.adminOnly).toBe(true);
  });

  it("getVisibleNavItems('admin') returns all 6 items", () => {
    const items = getVisibleNavItems("admin");
    expect(items).toHaveLength(6);
  });

  it("getVisibleNavItems('agent') returns 5 items (no settings)", () => {
    const items = getVisibleNavItems("agent");
    expect(items).toHaveLength(5);
    expect(items.find((i) => i.key === "settings")).toBeUndefined();
  });

  it("getVisibleNavItems('viewer') returns 5 items (no settings)", () => {
    const items = getVisibleNavItems("viewer");
    expect(items).toHaveLength(5);
    expect(items.find((i) => i.key === "settings")).toBeUndefined();
  });
});
