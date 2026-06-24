import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  listUsers,
  createUser,
  updateUserProfile,
  updateUserRole,
  toggleUserActive,
} from "@/actions/users";

vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

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

function mockInsertSequence(returnValues: unknown[][]) {
  let callIndex = 0;
  const valuesCalls: unknown[] = [];
  vi.mocked(db.insert).mockImplementation(() => {
    const current = returnValues[callIndex] ?? [];
    callIndex++;
    const returning = vi.fn().mockResolvedValue(current);
    const values = vi.fn().mockImplementation((v: unknown) => {
      valuesCalls.push(v);
      return { returning };
    });
    return { values } as never;
  });
  return { valuesCalls };
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
// createUser
// ============================================================================

describe("createUser", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  const VALID_INPUT = {
    name: "Marco Déménageur",
    email: "marco@locafleet.ch",
    password: "secret123",
    role: "employee",
    phone: "+41 79 123 45 67",
    hourlyRate: "28.50",
    employmentType: "hourly",
  };

  it("admin creates an employee → user + credential account", async () => {
    // 1st select: email uniqueness check → no duplicate
    mockSelectChain([]);
    // 1st insert: users → returns id; 2nd insert: accounts
    const { valuesCalls } = mockInsertSequence([[{ id: TARGET_USER_ID }], []]);

    const result = await createUser(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(TARGET_USER_ID);
    }
    expect(valuesCalls).toHaveLength(2);
    expect(valuesCalls[0]).toMatchObject({
      tenantId: ADMIN_USER.tenantId,
      email: VALID_INPUT.email,
      role: "employee",
      isActive: true,
      hourlyRate: "28.5",
      employmentType: "hourly",
    });
    expect(valuesCalls[1]).toMatchObject({
      userId: TARGET_USER_ID,
      accountId: TARGET_USER_ID,
      providerId: "credential",
      password: "hashed-password",
    });
  });

  it("rejects duplicate email (same tenant) → French error", async () => {
    mockSelectChain([{ id: "other-user-id" }]);

    const result = await createUser(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Un utilisateur avec cette adresse e-mail existe déjà"
      );
    }
  });

  it("rejects password shorter than 6 characters", async () => {
    const result = await createUser({ ...VALID_INPUT, password: "abc" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("6 caractères");
    }
  });

  it("rejects non-admin (agent has no users create permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(AGENT_USER);

    const result = await createUser(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("rejects unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await createUser(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("handles DB error gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await createUser(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("erreur est survenue");
    }
  });
});

// ============================================================================
// updateUserProfile
// ============================================================================

describe("updateUserProfile", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  const VALID_INPUT = {
    userId: TARGET_USER_ID,
    name: "Marco Déménageur",
    phone: "+41 79 123 45 67",
    hourlyRate: "30.00",
    employmentType: "salaried",
  };

  it("admin updates employee fields → success", async () => {
    const { set } = mockUpdateChain([{ id: TARGET_USER_ID }]);

    const result = await updateUserProfile(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: VALID_INPUT.name,
        phone: VALID_INPUT.phone,
        hourlyRate: "30",
        employmentType: "salaried",
      })
    );
  });

  it("clears optional fields when emptied", async () => {
    const { set } = mockUpdateChain([{ id: TARGET_USER_ID }]);

    const result = await updateUserProfile({
      userId: TARGET_USER_ID,
      name: "Marco",
      phone: "",
      hourlyRate: "",
      employmentType: "",
    });

    expect(result.success).toBe(true);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: null,
        hourlyRate: null,
        employmentType: null,
      })
    );
  });

  it("returns error when target user not found", async () => {
    mockUpdateChain([]);

    const result = await updateUserProfile(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("introuvable");
    }
  });

  it("rejects invalid input", async () => {
    const result = await updateUserProfile({
      userId: "not-a-uuid",
      name: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-admin", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(AGENT_USER);

    const result = await updateUserProfile(VALID_INPUT);

    expect(result.success).toBe(false);
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
