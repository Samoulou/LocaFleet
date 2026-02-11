import { getCurrentUser, type CurrentUser } from "@/lib/auth";

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

export type Role = CurrentUser["role"];

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
// Pure permission checks
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

// ============================================================================
// AuthorizationError
// ============================================================================

export type AuthorizationErrorCode =
  | "NOT_AUTHENTICATED"
  | "ACCOUNT_INACTIVE"
  | "ACCESS_DENIED";

export class AuthorizationError extends Error {
  public readonly code: AuthorizationErrorCode;

  constructor(code: AuthorizationErrorCode, message?: string) {
    const defaultMessages: Record<AuthorizationErrorCode, string> = {
      NOT_AUTHENTICATED: "User is not authenticated",
      ACCOUNT_INACTIVE: "User account is inactive",
      ACCESS_DENIED: "Access denied: insufficient permissions",
    };
    super(message ?? defaultMessages[code]);
    this.name = "AuthorizationError";
    this.code = code;
  }
}

// ============================================================================
// Server-side authorization guards
// ============================================================================

export async function requirePermission(
  resource: Resource,
  action: Action
): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthorizationError("NOT_AUTHENTICATED");
  }

  if (!user.isActive) {
    throw new AuthorizationError("ACCOUNT_INACTIVE");
  }

  if (!hasPermission(user.role, resource, action)) {
    throw new AuthorizationError("ACCESS_DENIED");
  }

  return user;
}

export async function requireSpecialPermission(
  permission: SpecialPermission
): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthorizationError("NOT_AUTHENTICATED");
  }

  if (!user.isActive) {
    throw new AuthorizationError("ACCOUNT_INACTIVE");
  }

  if (!hasSpecialPermission(user.role, permission)) {
    throw new AuthorizationError("ACCESS_DENIED");
  }

  return user;
}
