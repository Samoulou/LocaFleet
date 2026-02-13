# 15. Stratégie de Tests — LocaFleet

> **Objectif :** Chaque US livrée est couverte par des tests unitaires et e2e fonctionnels. Aucun merge sans tests passants.

---

## 1. Stack de Tests

| Couche | Outil | Quoi tester | Quand |
|--------|-------|-------------|-------|
| **Unit / Integration** | Vitest + React Testing Library | Server Actions, validations Zod, utilitaires, composants isolés | À chaque US |
| **E2E Fonctionnel** | Playwright | Parcours utilisateur complets (créer un contrat, faire une inspection...) | À chaque Epic terminé + avant merge sur `main` |
| **Type-check** | `tsc --noEmit` | Cohérence TypeScript du projet | Automatique (hook Claude Code) |
| **Lint** | ESLint | Qualité et conventions du code | Pre-commit |

---

## 2. Ce qu'on teste — et ce qu'on ne teste PAS

### ✅ On teste

| Type | Exemples concrets |
|------|------------------|
| **Server Actions** | `createClient()` insère bien en DB, retourne l'objet, filtre par tenantId |
| **Validations Zod** | `vehicleSchema.parse()` rejette une plaque vide, accepte un format valide |
| **Utilitaires** | `formatCHF(1250)` → `"1'250.00 CHF"`, `formatDate()` → `"15.01.2026"` |
| **Logique métier** | Calcul du montant total d'un contrat (jours × tarif + options), vérification de disponibilité véhicule |
| **Composants critiques** | StatusBadge affiche la bonne couleur, DataTable pagine correctement |
| **Parcours E2E** | Login → créer client → créer contrat → inspection départ → retour → facturer → payer |

### ❌ On ne teste PAS (V1)

| Skip | Raison |
|------|--------|
| shadcn/ui components internes | Déjà testés par la lib |
| CSS / styles visuels | Pas de visual regression testing en V1 |
| Supabase infra (auth interne, storage) | Pas notre responsabilité |
| Better Auth flows internes | On teste seulement notre intégration |

---

## 3. Organisation des Fichiers

> **Convention reelle :** tous les tests unitaires sont dans `src/__tests__/` (pas co-localisés).
> ~51 fichiers de tests existent actuellement.

```
src/
├── __tests__/                    # Tous les tests unitaires
│   ├── setup.ts                  # Mocks DB + Auth (vi.mock)
│   ├── actions/                  # Tests des Server Actions
│   │   ├── clients.test.ts
│   │   ├── vehicles.test.ts
│   │   ├── contracts.test.ts
│   │   ├── inspections.test.ts
│   │   └── invoices.test.ts
│   ├── validations/              # Tests des schemas Zod
│   │   ├── vehicle.test.ts
│   │   ├── client.test.ts
│   │   ├── contract.test.ts
│   │   └── inspection.test.ts
│   ├── components/               # Tests des composants partages
│   │   └── status-badge.test.tsx
│   ├── lib/                      # Tests utilitaires
│   │   ├── format-chf.test.ts
│   │   ├── format-date.test.ts
│   │   └── pricing.test.ts
│   └── i18n/                     # Tests internationalisation
│       └── messages.test.ts
├── actions/                      # Server Actions (source)
│   ├── vehicle.actions.ts
│   ├── client.actions.ts
│   ├── contract.actions.ts
│   └── inspection.actions.ts
├── components/
│   └── shared/
│       ├── status-badge.tsx
│       └── data-table.tsx
└── lib/
    ├── utils.ts
    └── pricing.ts

e2e/                               # Tests Playwright (racine du projet)
├── auth.setup.ts                  # Login partagé (storageState)
├── clients.spec.ts
├── vehicles.spec.ts
├── contracts.spec.ts
├── inspections.spec.ts
├── billing.spec.ts
└── fixtures/
    ├── test-data.ts               # Données de test partagées
    └── helpers.ts                 # Utilitaires Playwright (login, navigation...)
```

**Convention :** tests dans `src/__tests__/` organises par type (actions, validations, components, lib). Helpers de mock : `mockSelectChain()` et `mockInsertChain()` dans setup.ts.

---

## 4. Configuration Vitest

### `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",             // Pour les composants React
    globals: true,                     // describe, it, expect sans import
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/actions/**", "src/lib/**", "src/components/shared/**"],
      exclude: ["src/components/ui/**"],  // Pas de coverage sur shadcn
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### `src/__tests__/setup.ts`

```typescript
import "@testing-library/jest-dom/vitest";

// Mock de la connexion DB pour les tests unitaires
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {},
  },
}));

// Mock Better Auth
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "test-user-id",
    tenantId: "test-tenant-id",
    role: "admin",
    email: "admin@locafleet.ch",
  }),
}));
```

---

## 5. Configuration Playwright

### `playwright.config.ts`

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,        // Pas de .only en CI
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",            // Trace pour debug les failures
    screenshot: "only-on-failure",
    locale: "fr-CH",
    timezoneId: "Europe/Zurich",
  },

  // Login partagé — exécuté une seule fois
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",  // Session réutilisée
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 14"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Démarre le serveur Next.js automatiquement
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### `e2e/auth.setup.ts` — Login partagé

```typescript
import { test as setup, expect } from "@playwright/test";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@locafleet.ch");
  await page.getByLabel("Mot de passe").fill(process.env.TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/dashboard/);

  // Sauvegarde la session pour les autres tests
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
```

---

## 6. Patterns de Tests — Exemples Concrets

### 6a. Test unitaire — Validation Zod

```typescript
// src/__tests__/validations/client.test.ts
import { clientSchema } from "@/lib/validations/client";

describe("clientSchema", () => {
  it("accepte un client valide", () => {
    const result = clientSchema.safeParse({
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean@example.com",
      phone: "+41 79 123 45 67",
      licenseNumber: "G12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un email invalide", () => {
    const result = clientSchema.safeParse({
      firstName: "Jean",
      lastName: "Dupont",
      email: "pas-un-email",
      phone: "+41 79 123 45 67",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("email");
  });

  it("rejette un nom vide", () => {
    const result = clientSchema.safeParse({
      firstName: "",
      lastName: "Dupont",
      email: "jean@example.com",
    });
    expect(result.success).toBe(false);
  });
});
```

### 6b. Test unitaire — Utilitaire formatCHF

```typescript
// src/__tests__/utils/format-chf.test.ts
import { formatCHF } from "@/lib/utils";

describe("formatCHF", () => {
  it("formate avec apostrophe et CHF", () => {
    expect(formatCHF(1250)).toBe("1'250.00 CHF");
  });

  it("gère les centimes", () => {
    expect(formatCHF(99.5)).toBe("99.50 CHF");
  });

  it("gère les grands montants", () => {
    expect(formatCHF(1234567.89)).toBe("1'234'567.89 CHF");
  });

  it("gère zéro", () => {
    expect(formatCHF(0)).toBe("0.00 CHF");
  });
});
```

### 6c. Test unitaire — Server Action (avec mock DB)

```typescript
// src/actions/client.actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient, getClients } from "./client.actions";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth";

// Mock DB responses
vi.mocked(db.insert).mockReturnValue({
  values: vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([{
      id: "new-client-id",
      firstName: "Jean",
      lastName: "Dupont",
      tenantId: "test-tenant-id",
    }]),
  }),
} as any);

describe("createClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crée un client avec le tenantId de l'utilisateur connecté", async () => {
    const result = await createClient({
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean@example.com",
      phone: "+41 79 123 45 67",
    });

    expect(result.tenantId).toBe("test-tenant-id");
    expect(result.firstName).toBe("Jean");
  });

  it("refuse si l'utilisateur est viewer", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "viewer-id",
      tenantId: "test-tenant-id",
      role: "viewer",
      email: "viewer@locafleet.ch",
    });

    await expect(createClient({
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean@example.com",
    })).rejects.toThrow("Unauthorized");
  });

  it("rejette les données invalides (Zod)", async () => {
    await expect(createClient({
      firstName: "",
      lastName: "",
    })).rejects.toThrow();
  });
});
```

### 6d. Test composant — StatusBadge

```typescript
// src/components/shared/status-badge.test.tsx
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("affiche 'Disponible' en vert", () => {
    render(<StatusBadge status="available" type="vehicle" />);
    const badge = screen.getByText("Disponible");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("green");
  });

  it("affiche 'Loué' en violet", () => {
    render(<StatusBadge status="rented" type="vehicle" />);
    const badge = screen.getByText("Loué");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("violet");
  });

  it("affiche 'En maintenance' en amber", () => {
    render(<StatusBadge status="maintenance" type="vehicle" />);
    const badge = screen.getByText("Maintenance");
    expect(badge.className).toContain("amber");
  });
});
```

### 6e. Test E2E — Parcours complet client

```typescript
// e2e/clients.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Gestion des clients", () => {

  test("créer un nouveau client", async ({ page }) => {
    // Navigation
    await page.goto("/clients");
    await page.getByRole("link", { name: "Nouveau client" }).click();
    await expect(page).toHaveURL(/clients\/new/);

    // Remplir le formulaire
    await page.getByLabel("Prénom").fill("Marie");
    await page.getByLabel("Nom").fill("Müller");
    await page.getByLabel("Email").fill("marie@example.com");
    await page.getByLabel("Téléphone").fill("+41 79 987 65 43");
    await page.getByLabel("N° de permis").fill("Z98765432");

    // Soumettre
    await page.getByRole("button", { name: "Créer le client" }).click();

    // Vérifier redirection vers détail
    await expect(page).toHaveURL(/clients\/[\w-]+$/);
    await expect(page.getByText("Marie Müller")).toBeVisible();
    await expect(page.getByText("marie@example.com")).toBeVisible();
  });

  test("rechercher un client dans la liste", async ({ page }) => {
    await page.goto("/clients");

    // Recherche
    await page.getByPlaceholder("Rechercher").fill("Müller");
    await expect(page.getByRole("row")).toHaveCount(2); // header + 1 résultat
    await expect(page.getByText("Marie Müller")).toBeVisible();
  });

  test("modifier un client existant", async ({ page }) => {
    await page.goto("/clients");
    await page.getByText("Marie Müller").click();
    await page.getByRole("link", { name: "Modifier" }).click();

    await page.getByLabel("Téléphone").clear();
    await page.getByLabel("Téléphone").fill("+41 78 111 22 33");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.getByText("+41 78 111 22 33")).toBeVisible();
  });

  test("supprimer un client avec confirmation", async ({ page }) => {
    await page.goto("/clients");
    await page.getByText("Marie Müller").click();
    await page.getByRole("button", { name: "Supprimer" }).click();

    // Dialog de confirmation
    await expect(page.getByText("Êtes-vous sûr")).toBeVisible();
    await page.getByRole("button", { name: "Confirmer" }).click();

    // Retour à la liste, client absent
    await expect(page).toHaveURL(/clients$/);
    await expect(page.getByText("Marie Müller")).not.toBeVisible();
  });
});
```

### 6f. Test E2E — Parcours complet contrat (le plus critique)

```typescript
// e2e/contracts.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Cycle de vie d'un contrat", () => {

  test("parcours complet : création → inspection départ → retour → facturation", async ({ page }) => {
    // --- 1. Créer un contrat via le wizard ---
    await page.goto("/contracts/new");

    // Step 1: Client
    await page.getByPlaceholder("Rechercher un client").fill("Dupont");
    await page.getByText("Jean Dupont").click();
    await page.getByRole("button", { name: "Suivant" }).click();

    // Step 2: Véhicule
    await page.getByText("VD 123 456").click(); // Sélection véhicule
    await page.getByRole("button", { name: "Suivant" }).click();

    // Step 3: Tarification
    await page.getByLabel("Date de début").fill("15.03.2026");
    await page.getByLabel("Date de fin").fill("20.03.2026");
    await expect(page.getByText("5 jours")).toBeVisible();
    await expect(page.getByText("CHF")).toBeVisible(); // Montant calculé
    await page.getByRole("button", { name: "Suivant" }).click();

    // Step 4: Récapitulatif
    await expect(page.getByText("Jean Dupont")).toBeVisible();
    await expect(page.getByText("VD 123 456")).toBeVisible();
    await page.getByRole("button", { name: "Créer le contrat" }).click();

    // Vérifier création
    await expect(page).toHaveURL(/contracts\/[\w-]+$/);
    await expect(page.getByText("#LF-")).toBeVisible(); // Numéro de contrat
    const contractUrl = page.url();

    // --- 2. Inspection de départ ---
    await page.getByRole("link", { name: "Inspection départ" }).click();

    await page.getByLabel("Kilométrage").fill("45230");
    await page.getByLabel("Plein").click(); // Fuel level = full
    // Signature
    const canvas = page.locator("canvas");
    await canvas.click({ position: { x: 50, y: 50 } });
    await page.getByRole("button", { name: "Valider l'inspection" }).click();

    // Contrat passe en "Actif"
    await page.goto(contractUrl);
    await expect(page.getByText("Actif")).toBeVisible();

    // --- 3. Inspection de retour ---
    await page.getByRole("link", { name: "Inspection retour" }).click();

    await page.getByLabel("Kilométrage").fill("45780");
    await page.getByLabel("3/4").click(); // Fuel level
    // Ajouter un dommage
    await page.getByRole("button", { name: "Ajouter un dommage" }).click();
    await page.getByLabel("Zone").selectOption("front");
    await page.getByLabel("Type").selectOption("scratch");
    await page.getByLabel("Gravité").selectOption("low");
    // Signature
    await canvas.click({ position: { x: 50, y: 50 } });
    await page.getByRole("button", { name: "Valider l'inspection" }).click();

    // Contrat passe en "Terminé"
    await page.goto(contractUrl);
    await expect(page.getByText("Terminé")).toBeVisible();

    // --- 4. Facturation ---
    await page.goto("/dossiers");
    await page.getByText("À facturer").click();
    // Le dossier du contrat doit être dans la liste
    await expect(page.getByText("Jean Dupont")).toBeVisible();
  });
});
```

---

## 7. Commandes npm

Ajouter dans `package.json` :

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:headed": "playwright test --headed",
    "e2e:report": "playwright show-report",
    "check": "tsc --noEmit && npm run lint && npm run test"
  }
}
```

**Commande magique avant chaque commit :**
```bash
npm run check
```
→ Type-check + Lint + Tous les tests unitaires.

---

## 8. Quand écrire les tests — Par US

| Moment | Tests à écrire | Commande |
|--------|---------------|----------|
| **Pendant l'US** (Server Actions + validations) | Unit tests pour chaque action et chaque validation Zod | `npx vitest run src/actions/entity.actions.test.ts` |
| **Pendant l'US** (composants critiques) | Tests composants pour les composants partagés (badges, tables...) | `npx vitest run src/components/shared/component.test.tsx` |
| **À la fin de l'Epic** | Tests E2E pour le parcours complet de l'Epic | `npx playwright test e2e/feature.spec.ts` |
| **Avant merge sur `main`** | TOUS les tests | `npm run check && npm run e2e` |

### Coverage cibles par Phase

| Phase | Unit tests attendus | E2E tests attendus |
|-------|--------------------|--------------------|
| Phase 1 (Auth) ✅ | Auth helpers, utils (formatCHF, formatDate, cn) | Login/logout, redirection si non connecte |
| Phase 2 (Fleet) ✅ | Vehicle actions, vehicle schema, category CRUD | CRUD vehicule complet, upload photo, maintenance |
| Phase 3 (MVP) 🔄 | Client actions, contract actions, pricing logic, inspection actions, invoice actions | Flux complet : contrat → inspection depart → retour → archivage |

---

## 9. CI/CD — Tests automatiques

Mettre à jour `.github/workflows/ci.yml` :

```yaml
name: CI
on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm run test

  e2e:
    runs-on: ubuntu-latest
    needs: check                        # E2E seulement si unit tests passent
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
        env:
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 10. Dépendances à installer

```bash
# Unit tests
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8 @vitest/ui

# E2E tests
npm install -D @playwright/test
npx playwright install chromium
```

Ajouter à l'US-0.3 (Init projet Next.js).
