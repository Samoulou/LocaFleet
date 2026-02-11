import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import {
  hasPermission,
  hasSpecialPermission,
  type Action,
  type Resource,
  type SpecialPermission,
} from "@/lib/rbac";

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
