import { describe, it, expect } from "vitest";
import { canUseTool, TOOL_PERMISSIONS } from "@/lib/ai/tool-permissions";
import { TOOL_DEFINITIONS } from "@/lib/ai/tools";

// ============================================================================
// canUseTool — RBAC gate for AI copilot tools
// ============================================================================

const ALL_TOOLS = TOOL_DEFINITIONS.map((t) => t.function.name);

describe("TOOL_PERMISSIONS coverage", () => {
  it("defines a permission for every declared tool", () => {
    for (const name of ALL_TOOLS) {
      expect(TOOL_PERMISSIONS[name as keyof typeof TOOL_PERMISSIONS]).toBeDefined();
    }
  });

  it("declares no unknown tools", () => {
    const defined = Object.keys(TOOL_PERMISSIONS);
    expect(defined.sort()).toEqual([...ALL_TOOLS].sort());
  });
});

describe("canUseTool", () => {
  it("allows every tool for admin", () => {
    for (const name of ALL_TOOLS) {
      expect(canUseTool("admin", name)).toBe(true);
    }
  });

  it("allows every tool for agent (read-only financials included)", () => {
    for (const name of ALL_TOOLS) {
      expect(canUseTool("agent", name)).toBe(true);
    }
  });

  it("allows read tools for viewer", () => {
    for (const name of ALL_TOOLS) {
      expect(canUseTool("viewer", name)).toBe(true);
    }
  });

  it("restricts employee to vehicle-only tools", () => {
    const allowed = [
      "searchVehicles",
      "getVehicleAvailability",
      "getMaintenanceRecords",
    ];

    for (const name of ALL_TOOLS) {
      expect(canUseTool("employee", name)).toBe(allowed.includes(name));
    }
  });

  it("denies client/contract/invoice data for employee", () => {
    // These were reachable through the copilot before the RBAC gate existed.
    expect(canUseTool("employee", "searchClients")).toBe(false);
    expect(canUseTool("employee", "getClientContracts")).toBe(false);
    expect(canUseTool("employee", "getClientBalance")).toBe(false);
    expect(canUseTool("employee", "getDashboardSummary")).toBe(false);
  });

  it("denies unknown tools for any role", () => {
    for (const role of ["admin", "agent", "viewer", "employee"] as const) {
      expect(canUseTool(role, "dropTable")).toBe(false);
      expect(canUseTool(role, "__proto__")).toBe(false);
    }
  });
});
