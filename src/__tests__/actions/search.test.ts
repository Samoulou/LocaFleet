import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { globalSearch } from "@/actions/search";

// ============================================================================
// DB mock helpers
// ============================================================================

function mockSelectChain(returnValue: unknown[] = []) {
  const limit = vi.fn().mockResolvedValue(returnValue);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
  return { from, where, limit };
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

const MOCK_VEHICLES = [
  {
    id: "v1",
    brand: "Toyota",
    model: "RAV4",
    plateNumber: "VD 123 456",
  },
];

const MOCK_CLIENTS = [
  {
    id: "c1",
    firstName: "Marc",
    lastName: "Favre",
    email: "marc@test.ch",
  },
];

const MOCK_CONTRACTS = [
  {
    id: "ct1",
    contractNumber: "CTR-2024-001",
    status: "active" as const,
  },
];

// ============================================================================
// globalSearch
// ============================================================================

describe("globalSearch", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it("returns grouped results for matching query", async () => {
    // Need 3 calls to db.select for the 3 parallel queries
    const limit1 = vi.fn().mockResolvedValue(MOCK_VEHICLES);
    const where1 = vi.fn().mockReturnValue({ limit: limit1 });
    const from1 = vi.fn().mockReturnValue({ where: where1 });

    const limit2 = vi.fn().mockResolvedValue(MOCK_CLIENTS);
    const where2 = vi.fn().mockReturnValue({ limit: limit2 });
    const from2 = vi.fn().mockReturnValue({ where: where2 });

    const limit3 = vi.fn().mockResolvedValue(MOCK_CONTRACTS);
    const where3 = vi.fn().mockReturnValue({ limit: limit3 });
    const from3 = vi.fn().mockReturnValue({ where: where3 });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: from1 } as never)
      .mockReturnValueOnce({ from: from2 } as never)
      .mockReturnValueOnce({ from: from3 } as never);

    const result = await globalSearch({ query: "VD" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(1);
      expect(result.data.vehicles[0].title).toBe("Toyota RAV4");
      expect(result.data.vehicles[0].subtitle).toBe("VD 123 456");
      expect(result.data.vehicles[0].href).toBe("/vehicles/v1");
      expect(result.data.vehicles[0].type).toBe("vehicle");

      expect(result.data.clients).toHaveLength(1);
      expect(result.data.clients[0].title).toBe("Marc Favre");
      expect(result.data.clients[0].subtitle).toBe("marc@test.ch");
      expect(result.data.clients[0].href).toBe("/clients/c1");
      expect(result.data.clients[0].type).toBe("client");

      expect(result.data.contracts).toHaveLength(1);
      expect(result.data.contracts[0].title).toBe("CTR-2024-001");
      expect(result.data.contracts[0].subtitle).toBe("active");
      expect(result.data.contracts[0].href).toBe("/contracts/ct1");
      expect(result.data.contracts[0].type).toBe("contract");
    }
  });

  it("returns empty groups when no matches", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    vi.mocked(db.select).mockReturnValue({ from } as never);

    const result = await globalSearch({ query: "ZZZZZ" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicles).toHaveLength(0);
      expect(result.data.clients).toHaveLength(0);
      expect(result.data.contracts).toHaveLength(0);
    }
  });

  it("rejects unauthenticated users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await globalSearch({ query: "test" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not authenticated");
    }
  });

  it("rejects invalid input (too short query)", async () => {
    const result = await globalSearch({ query: "V" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("2 caractères");
    }
  });

  it("rejects missing query", async () => {
    const result = await globalSearch({});

    expect(result.success).toBe(false);
  });

  it("agent can search (all roles have read permission)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(AGENT_USER);
    mockSelectChain([]);

    const result = await globalSearch({ query: "test" });

    expect(result.success).toBe(true);
  });

  it("handles DB errors gracefully", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await globalSearch({ query: "test" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Une erreur est survenue");
    }
    consoleSpy.mockRestore();
  });
});
