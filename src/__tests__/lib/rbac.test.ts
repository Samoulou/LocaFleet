import { describe, it, expect, vi } from "vitest";
import {
  hasPermission,
  hasSpecialPermission,
  ROLE_PERMISSIONS,
  SPECIAL_PERMISSIONS,
  type Role,
  type Resource,
  type Action,
} from "@/lib/rbac";
import {
  requirePermission,
  requireSpecialPermission,
  AuthorizationError,
} from "@/lib/rbac-guards";
import { getCurrentUser } from "@/lib/auth";

// ============================================================================
// hasPermission
// ============================================================================

describe("hasPermission", () => {
  // --- admin ---
  it("admin can CRUD all resources", () => {
    const resources: Resource[] = [
      "vehicles",
      "clients",
      "contracts",
      "inspections",
      "invoices",
      "payments",
      "users",
      "settings",
    ];
    const actions: Action[] = ["create", "read", "update", "delete"];

    for (const resource of resources) {
      for (const action of actions) {
        expect(hasPermission("admin", resource, action)).toBe(true);
      }
    }
  });

  // --- agent ---
  it("agent can CRUD vehicles, clients, contracts, inspections", () => {
    const resources: Resource[] = [
      "vehicles",
      "clients",
      "contracts",
      "inspections",
    ];
    const actions: Action[] = ["create", "read", "update", "delete"];

    for (const resource of resources) {
      for (const action of actions) {
        expect(hasPermission("agent", resource, action)).toBe(true);
      }
    }
  });

  it("agent can only read invoices", () => {
    expect(hasPermission("agent", "invoices", "read")).toBe(true);
    expect(hasPermission("agent", "invoices", "create")).toBe(false);
    expect(hasPermission("agent", "invoices", "update")).toBe(false);
    expect(hasPermission("agent", "invoices", "delete")).toBe(false);
  });

  it("agent can only read payments", () => {
    expect(hasPermission("agent", "payments", "read")).toBe(true);
    expect(hasPermission("agent", "payments", "create")).toBe(false);
    expect(hasPermission("agent", "payments", "update")).toBe(false);
    expect(hasPermission("agent", "payments", "delete")).toBe(false);
  });

  it("agent can only read users", () => {
    expect(hasPermission("agent", "users", "read")).toBe(true);
    expect(hasPermission("agent", "users", "create")).toBe(false);
    expect(hasPermission("agent", "users", "update")).toBe(false);
    expect(hasPermission("agent", "users", "delete")).toBe(false);
  });

  it("agent has no settings access", () => {
    const actions: Action[] = ["create", "read", "update", "delete"];
    for (const action of actions) {
      expect(hasPermission("agent", "settings", action)).toBe(false);
    }
  });

  // --- viewer ---
  it("viewer can only read vehicles, clients, contracts, inspections, invoices", () => {
    const resources: Resource[] = [
      "vehicles",
      "clients",
      "contracts",
      "inspections",
      "invoices",
    ];

    for (const resource of resources) {
      expect(hasPermission("viewer", resource, "read")).toBe(true);
      expect(hasPermission("viewer", resource, "create")).toBe(false);
      expect(hasPermission("viewer", resource, "update")).toBe(false);
      expect(hasPermission("viewer", resource, "delete")).toBe(false);
    }
  });

  it("viewer has no payment access", () => {
    const actions: Action[] = ["create", "read", "update", "delete"];
    for (const action of actions) {
      expect(hasPermission("viewer", "payments", action)).toBe(false);
    }
  });

  it("viewer has no settings access", () => {
    const actions: Action[] = ["create", "read", "update", "delete"];
    for (const action of actions) {
      expect(hasPermission("viewer", "settings", action)).toBe(false);
    }
  });

  it("viewer can only read users", () => {
    expect(hasPermission("viewer", "users", "read")).toBe(true);
    expect(hasPermission("viewer", "users", "create")).toBe(false);
  });
});

// ============================================================================
// hasSpecialPermission
// ============================================================================

describe("hasSpecialPermission", () => {
  it("admin has process_payment permission", () => {
    expect(hasSpecialPermission("admin", "process_payment")).toBe(true);
  });

  it("agent does not have process_payment permission", () => {
    expect(hasSpecialPermission("agent", "process_payment")).toBe(false);
  });

  it("viewer does not have process_payment permission", () => {
    expect(hasSpecialPermission("viewer", "process_payment")).toBe(false);
  });
});

// ============================================================================
// AuthorizationError
// ============================================================================

describe("AuthorizationError", () => {
  it("is an instance of Error", () => {
    const err = new AuthorizationError("ACCESS_DENIED");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it("has correct name and code", () => {
    const err = new AuthorizationError("NOT_AUTHENTICATED");
    expect(err.name).toBe("AuthorizationError");
    expect(err.code).toBe("NOT_AUTHENTICATED");
  });

  it("uses default message when none provided", () => {
    const err = new AuthorizationError("ACCESS_DENIED");
    expect(err.message).toBe("Access denied: insufficient permissions");
  });

  it("uses custom message when provided", () => {
    const err = new AuthorizationError("ACCESS_DENIED", "Custom message");
    expect(err.message).toBe("Custom message");
  });
});

// ============================================================================
// requirePermission
// ============================================================================

describe("requirePermission", () => {
  it("returns user when authorized", async () => {
    const user = await requirePermission("vehicles", "read");
    expect(user).toEqual({
      id: "test-user-id",
      tenantId: "test-tenant-id",
      role: "admin",
      email: "admin@locafleet.ch",
      name: "Admin Test",
      isActive: true,
    });
  });

  it("throws NOT_AUTHENTICATED when no session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    await expect(requirePermission("vehicles", "read")).rejects.toThrow(
      AuthorizationError
    );
    try {
      vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
      await requirePermission("vehicles", "read");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).code).toBe("NOT_AUTHENTICATED");
    }
  });

  it("throws ACCOUNT_INACTIVE when user is inactive", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "test-user-id",
      tenantId: "test-tenant-id",
      role: "admin",
      email: "admin@locafleet.ch",
      name: "Admin Test",
      isActive: false,
    });
    try {
      await requirePermission("vehicles", "read");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).code).toBe("ACCOUNT_INACTIVE");
    }
  });

  it("throws ACCESS_DENIED when role lacks permission", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "test-user-id",
      tenantId: "test-tenant-id",
      role: "viewer",
      email: "viewer@locafleet.ch",
      name: "Viewer Test",
      isActive: true,
    });
    try {
      await requirePermission("vehicles", "create");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).code).toBe("ACCESS_DENIED");
    }
  });
});

// ============================================================================
// requireSpecialPermission
// ============================================================================

describe("requireSpecialPermission", () => {
  it("returns user when admin requests process_payment", async () => {
    const user = await requireSpecialPermission("process_payment");
    expect(user.role).toBe("admin");
  });

  it("throws ACCESS_DENIED when agent requests process_payment", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "test-user-id",
      tenantId: "test-tenant-id",
      role: "agent",
      email: "agent@locafleet.ch",
      name: "Agent Test",
      isActive: true,
    });
    try {
      await requireSpecialPermission("process_payment");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).code).toBe("ACCESS_DENIED");
    }
  });
});

// ============================================================================
// Constants integrity
// ============================================================================

describe("ROLE_PERMISSIONS", () => {
  it("is frozen (immutable)", () => {
    expect(Object.isFrozen(ROLE_PERMISSIONS)).toBe(true);
  });

  it("covers all three roles", () => {
    const roles: Role[] = ["admin", "agent", "viewer"];
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(roles.sort());
  });
});

describe("SPECIAL_PERMISSIONS", () => {
  it("is frozen (immutable)", () => {
    expect(Object.isFrozen(SPECIAL_PERMISSIONS)).toBe(true);
  });

  it("process_payment is admin-only", () => {
    expect(SPECIAL_PERMISSIONS.process_payment).toEqual(["admin"]);
  });
});
