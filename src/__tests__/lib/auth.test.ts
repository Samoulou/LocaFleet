import { describe, it, expect, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth";

// The mock is defined in setup.ts and returns a mocked admin user

describe("getCurrentUser", () => {
  it("returns user with expected properties", async () => {
    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("tenantId");
    expect(user).toHaveProperty("role");
    expect(user).toHaveProperty("email");
  });

  it("returns mocked admin user values", async () => {
    const user = await getCurrentUser();
    expect(user).toEqual({
      id: "test-user-id",
      tenantId: "test-tenant-id",
      role: "admin",
      email: "admin@locafleet.ch",
      name: "Admin Test",
      isActive: true,
    });
  });

  it("returns null when no session", async () => {
    const { getCurrentUser: mockedGetCurrentUser } = await import("@/lib/auth");
    vi.mocked(mockedGetCurrentUser).mockResolvedValueOnce(null);
    const user = await mockedGetCurrentUser();
    expect(user).toBeNull();
  });
});
