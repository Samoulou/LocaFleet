import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
vi.stubEnv("DIRECT_URL", "postgresql://test:test@localhost:5432/test");
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

// Mock DB connection for unit tests
vi.mock("@/db", () => {
  const mockDb: Record<string, unknown> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    query: {},
  };
  mockDb.transaction = vi
    .fn()
    .mockImplementation(async (cb: (tx: typeof mockDb) => unknown) =>
      cb(mockDb)
    );
  return { db: mockDb };
});

// Mock Supabase server client
vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServerClient: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed/file.pdf" },
        }),
      }),
    },
  }),
}));

// Mock Better Auth
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "test-user-id",
    tenantId: "test-tenant-id",
    role: "admin",
    email: "admin@locafleet.ch",
    name: "Admin Test",
    isActive: true,
  }),
}));
