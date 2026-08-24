import type { ToolName } from "@/lib/ai/tools";
import { hasPermission, type Action, type Resource, type Role } from "@/lib/rbac";

// ============================================================================
// AI copilot authorization
//
// The copilot runs server-side queries on behalf of the user, so every tool
// must map to a coarse RBAC (resource, action) pair from src/lib/rbac.ts.
// Without this gate, low-privilege roles (viewer/employee) could read clients,
// contracts or financial data through chat that the rest of the app denies.
// ============================================================================

export const TOOL_PERMISSIONS: Record<
  ToolName,
  { resource: Resource; action: Action }
> = {
  searchVehicles: { resource: "vehicles", action: "read" },
  getVehicleAvailability: { resource: "vehicles", action: "read" },
  getMaintenanceRecords: { resource: "vehicles", action: "read" },
  searchClients: { resource: "clients", action: "read" },
  getClientContracts: { resource: "contracts", action: "read" },
  getContracts: { resource: "contracts", action: "read" },
  // Unpaid invoices & monthly revenue are financial data → invoices/read
  getClientBalance: { resource: "invoices", action: "read" },
  getDashboardSummary: { resource: "invoices", action: "read" },
  generateEmail: { resource: "clients", action: "read" },
};

/** Whether `role` may invoke the given copilot tool. Unknown tools are denied. */
export function canUseTool(role: Role, toolName: string): boolean {
  // Object.hasOwn guards against inherited keys ("constructor", "toString",
  // "__proto__") being treated as valid tools via the prototype chain.
  const permission = Object.hasOwn(TOOL_PERMISSIONS, toolName)
    ? TOOL_PERMISSIONS[toolName as ToolName]
    : undefined;
  if (!permission) return false;
  return hasPermission(role, permission.resource, permission.action);
}
