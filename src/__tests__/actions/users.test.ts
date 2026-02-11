import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { listUsers, updateUserRole, toggleUserActive } from "@/actions/users";

// ============================================================================
// DB mock helpers
// ============================================================================

function mockSelectChain(returnValue: unknown[] = []) {
  const where = vi.fn().mockResolvedValue(returnValue);
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
  return { from, where };
}

function mockUpdateChain(returnValue: unknown[] = []) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return { set, where, returning };
}

// ============================================================================
// Constants
// ============================================================================

const ADMIN_USER = {
  id: "a0000000-0000-4000-8000-000000000001",
  tenantId: "t0000000-0000-4000-8000-000000000001",
  role: "admin" as const,
  email: "admin@locafleet.ch",
  name: "Admin Test",
  isActive: true,
};

const AGENT_USER = {
  id: "a0000000-0000-4000-8000-000000000002",
  tenantId: "t0000000-0000-4000-8000-000000000001",
  role: "agent" as const,
  email: "agent@locafleet.ch",
  name: "Agent Test",
  isActive: true,
};

const VIEWER_USER = {
  id: "a0000000-0000-4000-8000-000000000003",
  tenantId: "t0000000-0000-4000-8000-000000000001",
  role: "viewer" as const,
  email: "viewer@locafleet.ch",
  name: "Viewer Test",
  isActive: true,
};

const TARGET_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================================================
// listUsers
// ============================================================================

describe("listUsers", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("admin gets all users in tenant", async () => {
    const mockUsers = [
      {
        id: "u1",
        email: "a@test.ch",
        name: "A",
        role: "admin",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "u2",
        email: "b@test.ch",
        name: "B",
        role: "agent",
        isActive: true,
        createdAt: new Date(),
      },
    ];
    mockSelectChain(mockUsers);

    const result = await listUsers();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("agent gets only self", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(AGENT_USER);
    const selfData = [
      {
        id: AGENT_USER.id,
        email: AGENT_USER.email,
        name: AGENT_USER.name,
        role: "agent",
        isActive: true,
        createdAt: new Date(),
      },
    ];
    mockSelectChain(selfData);

    const result = await listUsers();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(AGENT_USER.id);
    }
  });

  it("viewer gets only self", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(VIEWER_USER);
    const selfData = [
      {
        id: VIEWER_USER.id,
        email: VIEWER_USER.email,
        name: VIEWER_USER.name,
        role: "viewer",
        isActive: true,
        createdAt: new Date(),
      },
    ];
    mockSelectChain(selfData);

    const result = await listUsers();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(VIEWER_USER.id);
    }
  });

  it("returns error when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await listUsers();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });
});

// ============================================================================
// updateUserRole
// ============================================================================

describe("updateUserRole", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("admin can update another user role", async () => {
    mockUpdateChain([{ id: TARGET_USER_ID }]);

    const result = await updateUserRole({
      userId: TARGET_USER_ID,
      role: "viewer",
    });

    expect(result.success).toBe(true);
  });

  it("rejects non-admin", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(AGENT_USER);

    const result = await updateUserRole({
      userId: TARGET_USER_ID,
      role: "viewer",
    });

    expect(result.success).toBe(false);
  });

  it("rejects self-change", async () => {
    const result = await updateUserRole({
      userId: ADMIN_USER.id,
      role: "agent",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("propre rôle");
    }
  });

  it("rejects invalid input", async () => {
    const result = await updateUserRole({
      userId: "not-a-uuid",
      role: "superadmin",
    });

    expect(result.success).toBe(false);
  });

  it("returns error when target user not found", async () => {
    mockUpdateChain([]);

    const result = await updateUserRole({
      userId: TARGET_USER_ID,
      role: "viewer",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("introuvable");
    }
  });
});

// ============================================================================
// toggleUserActive
// ============================================================================

describe("toggleUserActive", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("admin can deactivate another user", async () => {
    mockUpdateChain([{ id: TARGET_USER_ID }]);

    const result = await toggleUserActive({
      userId: TARGET_USER_ID,
      isActive: false,
    });

    expect(result.success).toBe(true);
  });

  it("admin can reactivate a user", async () => {
    mockUpdateChain([{ id: TARGET_USER_ID }]);

    const result = await toggleUserActive({
      userId: TARGET_USER_ID,
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects non-admin", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(AGENT_USER);

    const result = await toggleUserActive({
      userId: TARGET_USER_ID,
      isActive: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects self-deactivation", async () => {
    const result = await toggleUserActive({
      userId: ADMIN_USER.id,
      isActive: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("propre statut");
    }
  });

  it("rejects invalid input", async () => {
    const result = await toggleUserActive({
      userId: "not-a-uuid",
      isActive: "nope",
    });

    expect(result.success).toBe(false);
  });

  it("returns error when target user not found", async () => {
    mockUpdateChain([]);

    const result = await toggleUserActive({
      userId: TARGET_USER_ID,
      isActive: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("introuvable");
    }
  });
});
