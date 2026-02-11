// ============================================================================
// Types
// ============================================================================

export type Action = "create" | "read" | "update" | "delete";

export type Resource =
  | "vehicles"
  | "clients"
  | "contracts"
  | "inspections"
  | "invoices"
  | "payments"
  | "users"
  | "settings";

export type SpecialPermission = "process_payment";

export type Role = "admin" | "agent" | "viewer";

// ============================================================================
// Permission Matrix
// ============================================================================

const ALL_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
] as const satisfies readonly Action[];

const READ_ONLY = ["read"] as const satisfies readonly Action[];

const NONE = [] as const satisfies readonly Action[];

export const ROLE_PERMISSIONS: Readonly<
  Record<Role, Readonly<Record<Resource, readonly Action[]>>>
> = Object.freeze({
  admin: Object.freeze({
    vehicles: ALL_ACTIONS,
    clients: ALL_ACTIONS,
    contracts: ALL_ACTIONS,
    inspections: ALL_ACTIONS,
    invoices: ALL_ACTIONS,
    payments: ALL_ACTIONS,
    users: ALL_ACTIONS,
    settings: ALL_ACTIONS,
  }),
  agent: Object.freeze({
    vehicles: ALL_ACTIONS,
    clients: ALL_ACTIONS,
    contracts: ALL_ACTIONS,
    inspections: ALL_ACTIONS,
    invoices: READ_ONLY,
    payments: READ_ONLY,
    users: READ_ONLY,
    settings: NONE,
  }),
  viewer: Object.freeze({
    vehicles: READ_ONLY,
    clients: READ_ONLY,
    contracts: READ_ONLY,
    inspections: READ_ONLY,
    invoices: READ_ONLY,
    payments: NONE,
    users: READ_ONLY,
    settings: NONE,
  }),
});

export const SPECIAL_PERMISSIONS: Readonly<
  Record<SpecialPermission, readonly Role[]>
> = Object.freeze({
  process_payment: ["admin"],
});

// ============================================================================
// Pure permission checks (safe for client and server)
// ============================================================================

export function hasPermission(
  role: Role,
  resource: Resource,
  action: Action
): boolean {
  return ROLE_PERMISSIONS[role][resource].includes(action);
}

export function hasSpecialPermission(
  role: Role,
  permission: SpecialPermission
): boolean {
  return SPECIAL_PERMISSIONS[permission].includes(role);
}
