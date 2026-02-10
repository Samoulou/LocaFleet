---
name: locafleet-testing
description: >
  LocaFleet testing conventions for Vitest (unit/integration) and Playwright (E2E).
  Use when writing ANY test, fixing test failures, or reviewing test coverage.
  Activates for: test, spec, vitest, playwright, coverage, unit test, e2e, TDD.
---

# LocaFleet Testing Conventions

@docs/prd/15-testing-strategy.md

## Stack
- **Unit/Integration**: Vitest + React Testing Library + jsdom
- **E2E**: Playwright (Chromium + mobile)
- **Mocks**: vi.mock for DB and Auth (see setup.ts)

## File Organization
- Tests co-located: `entity.actions.test.ts` next to `entity.actions.ts`
- Shared test utils: `src/__tests__/setup.ts`
- E2E tests: `e2e/feature.spec.ts`
- E2E fixtures: `e2e/fixtures/`

## What to Test Per US

### MANDATORY for every US:
1. **Every Server Action** -> unit test (mock DB, verify tenantId, verify auth, verify Zod)
2. **Every Zod schema** -> unit test (valid data, invalid data, edge cases)
3. **Utility functions** -> unit test (formatCHF, formatDate, pricing calculations)

### MANDATORY at end of Epic:
4. **E2E user journey** -> Playwright test (full CRUD flow for the entity)

### OPTIONAL (write if time permits):
5. **Shared components** -> component test (StatusBadge, DataTable, BottomActionBar)

## Server Action Test Pattern
```typescript
// ALWAYS mock DB and Auth in setup.ts (already done)
// ALWAYS test these 3 scenarios:
describe("createEntity", () => {
  it("creates with correct tenantId from session");     // Happy path
  it("rejects if user role is viewer");                  // Auth check
  it("rejects invalid data (Zod validation)");           // Validation
});
```

## Full Server Action Test Example
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVehicle } from "@/actions/vehicle.actions";

// Mocks are set up in setup.ts
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "new-id", brand: "Toyota" }])
      })
    })
  }
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn()
}));

import { getCurrentUser } from "@/lib/auth";

describe("createVehicle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates vehicle with tenantId from session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      role: "admin"
    });

    const result = await createVehicle({
      brand: "Toyota",
      model: "Corolla",
      plateNumber: "GE 123456"
    });

    expect(result.id).toBe("new-id");
    // Verify tenantId was injected
  });

  it("rejects if user is viewer", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      role: "viewer"
    });

    await expect(createVehicle({ brand: "Toyota" }))
      .rejects.toThrow("Unauthorized");
  });

  it("rejects invalid data", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      role: "admin"
    });

    await expect(createVehicle({ brand: "" }))
      .rejects.toThrow(); // Zod validation error
  });
});
```

## Zod Schema Test Pattern
```typescript
import { describe, it, expect } from "vitest";
import { vehicleSchema } from "@/lib/validations/vehicle";

describe("vehicleSchema", () => {
  it("accepts valid vehicle data", () => {
    const result = vehicleSchema.safeParse({
      brand: "Toyota",
      model: "Corolla",
      plateNumber: "GE 123456"
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty brand", () => {
    const result = vehicleSchema.safeParse({
      brand: "",
      model: "Corolla",
      plateNumber: "GE 123456"
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid plate number format", () => {
    const result = vehicleSchema.safeParse({
      brand: "Toyota",
      model: "Corolla",
      plateNumber: "invalid"
    });
    expect(result.success).toBe(false);
  });
});
```

## E2E Test Pattern
```typescript
// ALWAYS use auth.setup.ts for shared login (storageState)
// ALWAYS test the complete CRUD: create -> read -> update -> delete
// ALWAYS verify visual feedback (toast, redirect, badge change)
// Use French labels: getByRole("button", { name: "Creer" })
// Use locale fr-CH and timezone Europe/Zurich

import { test, expect } from "@playwright/test";

test.describe("Vehicles CRUD", () => {
  test("admin can create a new vehicle", async ({ page }) => {
    await page.goto("/vehicles");
    await page.getByRole("button", { name: "Ajouter" }).click();

    await page.getByLabel("Marque").fill("Toyota");
    await page.getByLabel("Modele").fill("Corolla");
    await page.getByLabel("Immatriculation").fill("GE 123456");

    await page.getByRole("button", { name: "Creer" }).click();

    // Verify success
    await expect(page.getByText("Vehicule cree")).toBeVisible();
    await expect(page).toHaveURL(/\/vehicles\/[\w-]+/);
  });
});
```

## Commands
- Single test: `npx vitest run src/actions/client.actions.test.ts`
- All unit tests: `npm run test`
- Watch mode: `npx vitest`
- Coverage: `npm run test:coverage`
- Single E2E: `npx playwright test e2e/clients.spec.ts`
- E2E with browser: `npm run e2e:headed`
- Full check: `npm run check` (tsc + lint + unit tests)

## Rules
1. NO test without assertion - every `it()` MUST have at least one `expect()`
2. NO `any` in tests - type your mocks properly
3. NO hardcoded IDs - use variables from setup
4. Tests in FRENCH for user-facing strings (labels, button text)
5. Mock the DB, NEVER hit a real database in unit tests
6. E2E tests use a real dev database with seeded data
