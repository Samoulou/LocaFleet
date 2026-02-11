import { describe, it, expect } from "vitest";
import fr from "@/i18n/messages/fr.json";
import en from "@/i18n/messages/en.json";

function getKeyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...getKeyPaths(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe("i18n message files", () => {
  it("fr.json and en.json have identical top-level keys", () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });

  it("fr.json and en.json have identical nested key structure", () => {
    const frKeys = getKeyPaths(fr as unknown as Record<string, unknown>);
    const enKeys = getKeyPaths(en as unknown as Record<string, unknown>);
    expect(frKeys).toEqual(enKeys);
  });

  it("no empty string values in fr.json", () => {
    const frKeys = getKeyPaths(fr as unknown as Record<string, unknown>);
    for (const keyPath of frKeys) {
      const value = keyPath.split(".").reduce<unknown>((obj, key) => {
        return (obj as Record<string, unknown>)?.[key];
      }, fr);
      expect(value, `fr.json key "${keyPath}" is empty`).not.toBe("");
    }
  });

  it("no empty string values in en.json", () => {
    const enKeys = getKeyPaths(en as unknown as Record<string, unknown>);
    for (const keyPath of enKeys) {
      const value = keyPath.split(".").reduce<unknown>((obj, key) => {
        return (obj as Record<string, unknown>)?.[key];
      }, en);
      expect(value, `en.json key "${keyPath}" is empty`).not.toBe("");
    }
  });

  it("all keys in fr.json exist in en.json", () => {
    const frKeys = getKeyPaths(fr as unknown as Record<string, unknown>);
    const enKeys = new Set(
      getKeyPaths(en as unknown as Record<string, unknown>)
    );
    for (const key of frKeys) {
      expect(enKeys.has(key), `Key "${key}" missing in en.json`).toBe(true);
    }
  });

  it("all keys in en.json exist in fr.json", () => {
    const enKeys = getKeyPaths(en as unknown as Record<string, unknown>);
    const frKeys = new Set(
      getKeyPaths(fr as unknown as Record<string, unknown>)
    );
    for (const key of enKeys) {
      expect(frKeys.has(key), `Key "${key}" missing in fr.json`).toBe(true);
    }
  });

  it("has language-related keys in both files", () => {
    expect(fr.common.language).toBeDefined();
    expect(fr.common.languageFr).toBeDefined();
    expect(fr.common.languageEn).toBeDefined();
    expect(en.common.language).toBeDefined();
    expect(en.common.languageFr).toBeDefined();
    expect(en.common.languageEn).toBeDefined();
  });
});
