import { describe, it, expect } from "vitest";
import {
  SEED_TENANT,
  SEED_USERS,
  SEED_CATEGORIES,
  SEED_VEHICLES,
  SEED_CLIENTS,
  DEFAULT_SEED_PASSWORD,
  seedTenantSchema,
  seedUserSchema,
  seedCategorySchema,
  seedVehicleSchema,
  seedClientSchema,
  seedConfigSchema,
} from "@/db/seed-data";

// ============================================================================
// Seed data constants
// ============================================================================

describe("Seed tenant", () => {
  it("has name 'LocaFleet Demo'", () => {
    expect(SEED_TENANT.name).toBe("LocaFleet Demo");
  });

  it("has slug 'demo'", () => {
    expect(SEED_TENANT.slug).toBe("demo");
  });

  it("has a valid email", () => {
    expect(SEED_TENANT.email).toBe("contact@locafleet.ch");
  });

  it("has a Swiss phone number", () => {
    expect(SEED_TENANT.phone).toMatch(/^\+41/);
  });
});

describe("Seed users", () => {
  it("contains 3 users", () => {
    expect(SEED_USERS).toHaveLength(3);
  });

  it("has exactly one admin", () => {
    const admins = SEED_USERS.filter((u) => u.role === "admin");
    expect(admins).toHaveLength(1);
  });

  it("has exactly one agent", () => {
    const agents = SEED_USERS.filter((u) => u.role === "agent");
    expect(agents).toHaveLength(1);
  });

  it("has exactly one viewer", () => {
    const viewers = SEED_USERS.filter((u) => u.role === "viewer");
    expect(viewers).toHaveLength(1);
  });

  it("admin email is admin@locafleet.ch", () => {
    const admin = SEED_USERS.find((u) => u.role === "admin");
    expect(admin?.email).toBe("admin@locafleet.ch");
  });
});

describe("Seed categories", () => {
  it("contains 4 categories", () => {
    expect(SEED_CATEGORIES).toHaveLength(4);
  });

  it("contains all required category names", () => {
    const names = SEED_CATEGORIES.map((c) => c.name);
    expect(names).toContain("Citadine");
    expect(names).toContain("Berline");
    expect(names).toContain("SUV");
    expect(names).toContain("Utilitaire");
  });

  it("has consecutive sort orders starting at 1", () => {
    const orders = SEED_CATEGORIES.map((c) => c.sortOrder);
    expect(orders).toEqual([1, 2, 3, 4]);
  });

  it("all rates are CHF decimal strings", () => {
    for (const cat of SEED_CATEGORIES) {
      expect(cat.dailyRate).toMatch(/^\d+\.\d{2}$/);
      expect(cat.weeklyRate).toMatch(/^\d+\.\d{2}$/);
    }
  });
});

describe("Seed vehicles", () => {
  it("contains 8 vehicles", () => {
    expect(SEED_VEHICLES).toHaveLength(8);
  });

  it("all vehicle categoryIds reference a seed category", () => {
    const categoryIds = SEED_CATEGORIES.map((c) => c.id);
    for (const v of SEED_VEHICLES) {
      expect(categoryIds).toContain(v.categoryId);
    }
  });
});

describe("Seed clients", () => {
  it("contains 7 clients", () => {
    expect(SEED_CLIENTS).toHaveLength(7);
  });
});

describe("Default password", () => {
  it("is defined and non-empty", () => {
    expect(DEFAULT_SEED_PASSWORD).toBeTruthy();
    expect(DEFAULT_SEED_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });
});

// ============================================================================
// Unique IDs
// ============================================================================

describe("Unique IDs across all seed data", () => {
  it("all IDs are unique", () => {
    const allIds = [
      SEED_TENANT.id,
      ...SEED_USERS.map((u) => u.id),
      ...SEED_CATEGORIES.map((c) => c.id),
      ...SEED_VEHICLES.map((v) => v.id),
      ...SEED_CLIENTS.map((c) => c.id),
    ];
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });
});

// ============================================================================
// Zod schema validation
// ============================================================================

describe("seedTenantSchema", () => {
  it("accepts the seed tenant", () => {
    expect(seedTenantSchema.safeParse(SEED_TENANT).success).toBe(true);
  });

  it("rejects missing name", () => {
    const { name: _name, ...noName } = SEED_TENANT;
    expect(seedTenantSchema.safeParse(noName).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(
      seedTenantSchema.safeParse({ ...SEED_TENANT, name: "" }).success
    ).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(
      seedTenantSchema.safeParse({ ...SEED_TENANT, email: "not-an-email" })
        .success
    ).toBe(false);
  });

  it("rejects invalid UUID for id", () => {
    expect(
      seedTenantSchema.safeParse({ ...SEED_TENANT, id: "bad-id" }).success
    ).toBe(false);
  });
});

describe("seedUserSchema", () => {
  const validUser = SEED_USERS[0];

  it("accepts a valid user", () => {
    expect(seedUserSchema.safeParse(validUser).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(
      seedUserSchema.safeParse({ ...validUser, email: "bad" }).success
    ).toBe(false);
  });

  it("rejects invalid role", () => {
    expect(
      seedUserSchema.safeParse({ ...validUser, role: "superadmin" }).success
    ).toBe(false);
  });

  it("rejects missing name", () => {
    const { name: _name, ...noName } = validUser;
    expect(seedUserSchema.safeParse(noName).success).toBe(false);
  });
});

describe("seedCategorySchema", () => {
  const validCategory = SEED_CATEGORIES[0];

  it("accepts a valid category", () => {
    expect(seedCategorySchema.safeParse(validCategory).success).toBe(true);
  });

  it("rejects missing name", () => {
    const { name: _name, ...noName } = validCategory;
    expect(seedCategorySchema.safeParse(noName).success).toBe(false);
  });

  it("rejects invalid rate format", () => {
    expect(
      seedCategorySchema.safeParse({ ...validCategory, dailyRate: "45" })
        .success
    ).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    expect(
      seedCategorySchema.safeParse({ ...validCategory, sortOrder: -1 }).success
    ).toBe(false);
  });
});

describe("seedVehicleSchema", () => {
  const validVehicle = SEED_VEHICLES[0];

  it("accepts a valid vehicle", () => {
    expect(seedVehicleSchema.safeParse(validVehicle).success).toBe(true);
  });

  it("rejects invalid fuel type", () => {
    expect(
      seedVehicleSchema.safeParse({ ...validVehicle, fuelType: "nuclear" })
        .success
    ).toBe(false);
  });
});

describe("seedClientSchema", () => {
  const validClient = SEED_CLIENTS[0];

  it("accepts a valid client", () => {
    expect(seedClientSchema.safeParse(validClient).success).toBe(true);
  });

  it("accepts a client with companyName", () => {
    const lastClient = SEED_CLIENTS[SEED_CLIENTS.length - 1];
    expect(seedClientSchema.safeParse(lastClient).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(
      seedClientSchema.safeParse({ ...validClient, email: "nope" }).success
    ).toBe(false);
  });
});

describe("seedConfigSchema (composite)", () => {
  const validConfig = {
    tenant: SEED_TENANT,
    users: [...SEED_USERS],
    categories: [...SEED_CATEGORIES],
    vehicles: [...SEED_VEHICLES],
    clients: [...SEED_CLIENTS],
  };

  it("accepts the full seed config", () => {
    expect(seedConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it("rejects empty users array", () => {
    expect(
      seedConfigSchema.safeParse({ ...validConfig, users: [] }).success
    ).toBe(false);
  });

  it("rejects empty categories array", () => {
    expect(
      seedConfigSchema.safeParse({ ...validConfig, categories: [] }).success
    ).toBe(false);
  });

  it("rejects when tenant is invalid", () => {
    expect(
      seedConfigSchema.safeParse({
        ...validConfig,
        tenant: { ...SEED_TENANT, email: "not-valid" },
      }).success
    ).toBe(false);
  });
});
