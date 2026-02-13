# LocaFleet — Claude Code Setup Guide

> Guide complet pour configurer Claude Code avec les meilleurs skills, un orchestrateur intelligent, et les best practices pour un code production-ready.

---

## 1. Skills Recommandés

### 🔴 Tier 1 — Officiels (install en priorité)

Ces skills viennent d'équipes officielles (Anthropic, Supabase) et sont les plus fiables.

| Skill | Source | Install | Pourquoi |
|-------|--------|---------|----------|
| **Supabase Postgres Best Practices** | `supabase/agent-skills` | `/plugin marketplace add supabase/agent-skills` puis `/plugin install postgres-best-practices@supabase-agent-skills` | Optimisation requêtes, indexes, RLS — directement de Supabase |
| **Anthropic Document Skills** | `anthropics/skills` | `/plugin marketplace add anthropics/skills` puis `/plugin install document-skills@anthropic-agent-skills` | PDF generation (contrats, factures, constats) |
| **Anthropic Example Skills** | `anthropics/skills` | `/plugin install example-skills@anthropic-agent-skills` | Frontend design, MCP server, testing patterns |

### 🟠 Tier 2 — Community (high quality, validés)

Skills communautaires avec ≥10 stars, activement maintenus.

| Skill | Repo / Source | Install | Usage LocaFleet |
|-------|---------------|---------|-----------------|
| **Next.js App Router Patterns** | `anton-abyzov/specweave` | `/plugin marketplace add anton-abyzov/specweave` | Server Components, Server Actions, caching, routing patterns |
| **Engineering Workflows** (git, test-fixing, code review, feature planning) | `mhattingpete/claude-skills-marketplace` | `/plugin marketplace add mhattingpete/claude-skills-marketplace` puis `/plugin install engineering-workflow-plugin@...` | Git automation, conventional commits, code review, test fixing |
| **Software Architecture** | `ComposioHQ/awesome-claude-skills` (ref) | Copier le SKILL.md manuellement dans `.claude/skills/` | Clean Architecture, SOLID, design patterns |
| **shadcn/ui** | `google-labs-code` (via VoltAgent) | Chercher sur skillsmp.com : "shadcn-ui" | Composants UI, patterns, theming |

### 🟡 Tier 3 — À créer nous-mêmes (custom pour LocaFleet)

Skills qu'on doit écrire car ils sont spécifiques à notre stack exact.

| Skill | Contenu | Priorité |
|-------|---------|----------|
| **locafleet-stack** | Stack complète (Next.js 15 + Drizzle + Supabase + Hono + Better Auth + Railway) — conventions, patterns, file structure | 🔴 Critique |
| **locafleet-schema** | Référence du schéma Drizzle (23 tables, 23 enums, relations) — Claude le consulte avant toute requête DB | 🔴 Critique |
| **locafleet-ui** | Design system (couleurs, badges, patterns A/B/C/D, sidebar specs, planby config) | 🔴 Critique |
| **locafleet-testing** | Conventions de tests (Vitest + Playwright), patterns, mocks DB/Auth, organisation fichiers | 🔴 Critique |
| **locafleet-orchestrator** | Meta-skill qui route vers le bon skill selon la tâche (voir section 2) | 🟠 Important |

---

## 2. Orchestrator Skill — Le "Chef d'orchestre"

Ce meta-skill donne à Claude une vue sur tous les skills disponibles et le guide pour choisir le bon automatiquement.

### Fichier : `.claude/skills/orchestrator/SKILL.md`

```markdown
---
name: locafleet-orchestrator
description: >
  Meta-skill that routes tasks to the best available skill.
  Use this skill for ANY task to ensure optimal skill selection.
  Activates automatically on every request.
---

# LocaFleet Orchestrator

You are working on LocaFleet, a Swiss car rental fleet management app.
Before executing ANY task, consult this routing table to determine which skill(s) to activate.

## Skill Routing Table

### Database & Backend
| Task pattern | Skill to use | Notes |
|-------------|-------------|-------|
| Schema changes, migrations, new tables | `locafleet-schema` + `postgres-best-practices` | ALWAYS check schema.ts first |
| Drizzle queries, joins, relations | `locafleet-schema` + `postgres-best-practices` | Use type-safe patterns |
| Server Actions (CRUD) | `locafleet-stack` + `nextjs` | Follow Server Actions conventions |
| Hono API routes (PDF, email, heavy jobs) | `locafleet-stack` | Mount on /api/*, use Zod validation |
| Better Auth config, sessions, RBAC | `locafleet-stack` | Check auth.ts patterns |
| Supabase Storage (upload, buckets) | `postgres-best-practices` | Use signed URLs, RLS on buckets |
| RLS policies | `postgres-best-practices` + `locafleet-schema` | tenant_id filtering on every table |

### Frontend & UI
| Task pattern | Skill to use | Notes |
|-------------|-------------|-------|
| New page/component | `locafleet-ui` + `nextjs` | Check design patterns A/B/C/D |
| shadcn/ui components | `shadcn-ui` + `locafleet-ui` | Follow color palette & badge mapping |
| Forms (react-hook-form + Zod) | `nextjs` + `locafleet-stack` | Server Actions for submission |
| Planning/Gantt view | `locafleet-ui` | planby library, see planning specs |
| Dashboard KPIs & charts | `locafleet-ui` | Recharts, see dashboard layout |
| Tables with filters, pagination | `locafleet-ui` | TanStack Table + shadcn DataTable |
| i18n (translations) | `locafleet-stack` | next-intl, FR/EN, format suisse |

### Infrastructure & DevOps
| Task pattern | Skill to use | Notes |
|-------------|-------------|-------|
| Git commit, push, PR | `engineering-workflows` | Conventional commits |
| Code review | `engineering-workflows` | Run before every PR |
| Test failures | `engineering-workflows` | Systematic test fixing |
| CI/CD, deployment | `locafleet-stack` | Railway auto-deploy |
| Error tracking | `locafleet-stack` | Sentry integration |

### Documents & PDF
| Task pattern | Skill to use | Notes |
|-------------|-------------|-------|
| Generate contract PDF | `document-skills` + `locafleet-stack` | @react-pdf/renderer |
| Generate invoice PDF | `document-skills` + `locafleet-stack` | Format suisse: CHF, apostrophes |
| Generate inspection PDF | `document-skills` | Include photos + signature |

### Testing
| Task pattern | Skill to use | Notes |
|-------------|-------------|-------|
| Unit test Server Action | `locafleet-testing` + `locafleet-schema` | Mock DB, test tenantId + auth + Zod |
| Unit test Zod schema | `locafleet-testing` | Test valid/invalid inputs, edge cases |
| Unit test utility function | `locafleet-testing` | formatCHF, formatDate, pricing logic |
| Component test | `locafleet-testing` | React Testing Library, test render + interactions |
| E2E test | `locafleet-testing` | Playwright, full user journey, use auth setup |
| Fix failing tests | `engineering-workflows` + `locafleet-testing` | Systematic test fixing |

## Execution Rules

1. **ALWAYS read `locafleet-schema` before any DB operation** — never guess table/column names
2. **ALWAYS read `locafleet-ui` before any UI component** — follow the design system exactly
3. **ALWAYS read `locafleet-stack` for conventions** — file naming, folder structure, error handling
4. **ALWAYS write unit tests for Server Actions and Zod schemas** — no action without a test
5. **Combine skills** — most tasks need 2-3 skills simultaneously
6. **When in doubt, check the PRD** — files in `docs/prd/` are the source of truth
7. **Format suisse** — Dates: DD.MM.YYYY, Montants: 1'250.00 CHF, Langue par défaut: FR
```

---

## 3. Custom Skills à Créer

### 3a. `.claude/skills/locafleet-stack/SKILL.md`

```markdown
---
name: locafleet-stack
description: >
  LocaFleet technology stack conventions, file structure, and coding patterns.
  Use when creating any new file, component, route, or server action.
---

# LocaFleet Stack Conventions

## Tech Stack
- **Framework**: Next.js 15+ (App Router, React Server Components)
- **Language**: TypeScript 5+ (strict mode)
- **Styling**: Tailwind CSS 3.x + shadcn/ui
- **ORM**: Drizzle ORM (PostgreSQL 16)
- **Database**: Supabase (PostgreSQL 16 + PgBouncer + Storage + RLS)
- **Auth**: Better Auth (email/password, organization plugin for multi-tenant)
- **API**: Server Actions (CRUD) + Hono (mounted on /api for heavy jobs)
- **Email**: Resend + React Email
- **PDF**: @react-pdf/renderer
- **Validation**: Zod + react-hook-form
- **i18n**: next-intl (FR/EN)
- **Planning**: planby (Gantt timeline)
- **Charts**: Recharts
- **Hosting**: Railway (Node.js 24/7, no cold starts)

## File Structure
```
src/
├── app/
│   ├── [locale]/              # next-intl locale wrapper
│   │   ├── (auth)/            # Public routes (login)
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/       # Protected routes (sidebar layout)
│   │   │   ├── layout.tsx     # Sidebar + TopBar layout
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── vehicles/
│   │   │   │   ├── page.tsx           # List (Pattern A)
│   │   │   │   ├── [id]/page.tsx      # Detail (Pattern B)
│   │   │   │   └── new/page.tsx       # Create form
│   │   │   ├── clients/
│   │   │   ├── contracts/
│   │   │   ├── planning/
│   │   │   ├── dossiers/
│   │   │   ├── maintenance/
│   │   │   └── settings/
│   │   └── layout.tsx         # Root locale layout
│   ├── api/
│   │   ├── [...route]/route.ts  # Hono catch-all
│   │   └── auth/[...all]/route.ts # Better Auth
│   └── layout.tsx             # Root layout (fonts, metadata)
├── components/
│   ├── ui/                    # shadcn/ui (DO NOT EDIT manually)
│   ├── shared/                # Reusable business components
│   │   ├── app-sidebar.tsx
│   │   ├── command-search.tsx
│   │   ├── data-table.tsx
│   │   ├── status-badge.tsx
│   │   ├── page-header.tsx
│   │   └── bottom-action-bar.tsx
│   └── forms/                 # Form components
├── db/
│   ├── schema.ts              # SINGLE SOURCE OF TRUTH for all tables
│   ├── index.ts               # DB connection (pooled)
│   └── seed.ts                # Seed data
├── lib/
│   ├── auth.ts                # Better Auth config
│   ├── auth-client.ts         # Client-side auth
│   ├── hono.ts                # Hono app instance
│   ├── utils.ts               # cn(), formatCHF(), formatDate()
│   ├── constants.ts           # App-wide constants
│   └── validations/           # Zod schemas (1 file per entity)
│       ├── vehicle.ts
│       ├── client.ts
│       ├── contract.ts
│       └── inspection.ts
├── actions/                   # Server Actions (1 file per entity)
│   ├── vehicle.actions.ts
│   ├── client.actions.ts
│   ├── contract.actions.ts
│   └── inspection.actions.ts
├── hooks/                     # Custom React hooks
├── types/                     # Shared TypeScript types
├── i18n/
│   ├── messages/
│   │   ├── fr.json
│   │   └── en.json
│   ├── request.ts
│   └── routing.ts
└── emails/                    # React Email templates
```

## Coding Conventions

### Naming
- Files: `kebab-case.tsx` (components), `camelCase.ts` (utilities)
- Components: `PascalCase`
- DB columns: `snake_case` (Drizzle handles mapping)
- Server Actions: `entityAction` pattern (e.g., `createVehicle`, `updateClient`)
- Zod schemas: `entitySchema` (e.g., `vehicleSchema`, `contractSchema`)

### Server Components vs Client Components
- DEFAULT to Server Components (no 'use client')
- Use 'use client' ONLY for: onClick, useState, useEffect, form interactions
- Keep client components SMALL and at leaf level
- Pass data DOWN from server to client, never fetch in client

### Server Actions Pattern
```typescript
// actions/vehicle.actions.ts
"use server";

import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { vehicleSchema } from "@/lib/validations/vehicle";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

export async function createVehicle(data: unknown) {
  const user = await getCurrentUser();
  if (!user || user.role === "viewer") throw new Error("Unauthorized");

  const validated = vehicleSchema.parse(data);

  const [vehicle] = await db
    .insert(vehicles)
    .values({ ...validated, tenantId: user.tenantId })
    .returning();

  revalidatePath("/vehicles");
  return vehicle;
}
```

### Error Handling
- Server Actions: throw errors, catch in form with useActionState
- Hono routes: return proper HTTP status codes with Zod error formatting
- Client: sonner toast for success/error feedback
- NEVER swallow errors silently

### Swiss Formatting
- Currency: `1'250.00 CHF` (apostrophe as thousands separator, CHF after)
- Dates: `15.01.2026` (DD.MM.YYYY) or `15 Jan 2026`
- Phone: `+41 79 123 45 67`
- Language: French by default, English available

### Multi-tenant
- EVERY query MUST filter by `tenantId`
- NEVER expose data across tenants
- Use RLS as defense-in-depth (Supabase)
- `tenantId` comes from the authenticated user session, NEVER from the request
```

### 3b. `.claude/skills/locafleet-schema/SKILL.md`

```markdown
---
name: locafleet-schema
description: >
  Complete database schema reference for LocaFleet.
  MUST be consulted before ANY database operation (query, insert, update, migration).
  Contains all 23 tables, 23 enums, relations, and indexes.
---

# LocaFleet Database Schema

## Quick Reference

@src/db/schema.ts

## Tables (23 tables)

### Foundation
- `tenants`, `users`, `sessions`, `accounts`, `verifications`

### Fleet
- `vehicles`, `vehicle_categories`, `vehicle_photos`, `maintenance_records`

### Clients & Contracts
- `clients`, `client_documents`, `rental_options`, `rental_contracts`, `contract_options`

### Inspections
- `inspections`, `inspection_photos`, `inspection_damages`

### Billing
- `invoices`, `payments`, `rental_dossiers`

### Notifications & Audit
- `email_logs`, `notifications`, `audit_logs`

## Key Enums
vehicle_status: available | rented | maintenance | out_of_service
contract_status: draft | active | completed | cancelled
invoice_status: pending | invoiced | verification | paid | conflict | cancelled
inspection_type: departure | return
fuel_level: empty | quarter | half | three_quarter | full
damage_severity: low | medium | high
payment_method: cash | card | bank_transfer

## Critical Indexes
- `vehicles_plate_tenant_idx` — UNIQUE(plateNumber, tenantId)
- `contracts_dates_idx` — (vehicleId, startDate, endDate) for availability checks
- `contracts_number_tenant_idx` — UNIQUE(contractNumber, tenantId)
- `invoices_number_tenant_idx` — UNIQUE(invoiceNumber, tenantId)

## Rules
1. ALWAYS include tenantId in WHERE clauses
2. Use Drizzle's `with` for eager loading relations
3. Use `returning()` for insert/update to get the created/updated record
4. Decimal fields use `{ precision: 10, scale: 2 }` — parse with parseFloat
5. Soft delete: check `deletedAt IS NULL` for vehicles and clients
6. Timestamps: always use `defaultNow()`, never set manually
```

### 3c. `.claude/skills/locafleet-ui/SKILL.md`

```markdown
---
name: locafleet-ui
description: >
  LocaFleet design system and UI patterns.
  Use when creating ANY UI component, page, or visual element.
  Contains color palette, status badges, layout patterns, and component specs.
---

# LocaFleet UI Design System

@docs/prd/3-user-interface-design-goals.md

## Navigation: SIDEBAR ONLY
- No horizontal nav in top bar
- Sidebar: 240px expanded, 64px collapsed
- Top bar: search (⌘K) + notifications + user avatar ONLY

## Page Patterns
- Pattern A (List): Page header + filters + DataTable + pagination + bottom action bar
- Pattern B (Detail): Breadcrumb + title/badge + info cards + tabs + sidebar actions
- Pattern C (Wizard): Stepper horizontal + form steps + prev/next buttons
- Pattern D (Dashboard): KPI grid + alert cards + charts

## Color Palette
- Primary: blue-600 (#2563EB), hover: blue-700
- Success/Disponible: green-600
- Warning/Maintenance: amber-600
- Danger/Retard: red-600
- Loué/Actif: violet-600
- Text: slate-900 (primary), slate-500 (secondary)
- Borders: slate-200
- Background: slate-50, Cards: white

## Currency Format
ALWAYS: `1'250.00 CHF` — apostrophe separator, CHF suffix

## Status Badge Pattern
`<Badge className="bg-{color}-50 text-{color}-700 border-{color}-200">`
```

### 3d. `.claude/skills/locafleet-testing/SKILL.md`

```markdown
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
- Server Action tests: `src/__tests__/actions/entity.test.ts`
- Validation tests: `src/__tests__/validations/entity.test.ts`
- Component tests: `src/__tests__/components/entity.test.tsx`
- Lib/util tests: `src/__tests__/lib/entity.test.ts`
- Shared test utils: `src/__tests__/setup.ts`
- E2E tests: `e2e/feature.spec.ts`
- E2E fixtures: `e2e/fixtures/`

## What to Test Per US

### MANDATORY for every US:
1. **Every Server Action** → unit test (mock DB, verify tenantId, verify auth, verify Zod)
2. **Every Zod schema** → unit test (valid data, invalid data, edge cases)
3. **Utility functions** → unit test (formatCHF, formatDate, pricing calculations)

### MANDATORY at end of Epic:
4. **E2E user journey** → Playwright test (full CRUD flow for the entity)

### OPTIONAL (write if time permits):
5. **Shared components** → component test (StatusBadge, DataTable, BottomActionBar)

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

## E2E Test Pattern
```typescript
// ALWAYS use auth.setup.ts for shared login (storageState)
// ALWAYS test the complete CRUD: create → read → update → delete
// ALWAYS verify visual feedback (toast, redirect, badge change)
// Use French labels: getByRole("button", { name: "Créer" })
// Use locale fr-CH and timezone Europe/Zurich
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
1. NO test without assertion — every `it()` MUST have at least one `expect()`
2. NO `any` in tests — type your mocks properly
3. NO hardcoded IDs — use variables from setup
4. Tests in FRENCH for user-facing strings (labels, button text)
5. Mock the DB, NEVER hit a real database in unit tests
6. E2E tests use a real dev database with seeded data
```

---

## 4. CLAUDE.md — Fichier Racine du Projet

```markdown
# LocaFleet

Swiss car rental fleet management back-office (30-100 vehicles).

## Stack
Next.js 15 (App Router) + Drizzle ORM + Supabase (PostgreSQL 16) + Better Auth + Hono + Railway

## Commands
- `npm run dev` — Start dev server (localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — Type check
- `npx drizzle-kit push` — Push schema to Supabase (uses DIRECT_URL)
- `npx drizzle-kit generate` — Generate migration files
- `npx tsx src/db/seed.ts` — Seed database

## Code Style
- TypeScript strict mode, NO `any` types
- ES modules (import/export), NOT CommonJS
- Functional components with hooks, NO class components
- Server Components by default, 'use client' only when needed (interactivity)
- Destructure imports: `import { eq } from "drizzle-orm"`
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Error messages in French for user-facing, English for logs/technical

## Architecture
- Server Actions for CRUD mutations (in `src/actions/`)
- Hono API routes for heavy jobs: PDF gen, email, background tasks (in `src/app/api/`)
- Zod validation on ALL inputs (server-side, never trust client)
- EVERY DB query filters by `tenantId` (multi-tenant)
- Currency: `CHF` with apostrophe thousands separator (1'250.00 CHF)
- Dates: DD.MM.YYYY format

## Testing
- Run single unit test: `npx vitest run src/path/to/test.ts`
- Run all unit tests: `npm run test`
- Run tests in watch mode: `npx vitest`
- Run E2E tests: `npx playwright test e2e/feature.spec.ts`
- Run all E2E: `npm run e2e`
- Full check before commit: `npm run check` (tsc + lint + unit tests)
- Type check after changes: `npx tsc --noEmit`
- Lint after changes: `npm run lint`
- EVERY Server Action MUST have a unit test
- EVERY Zod schema MUST have a unit test
- EVERY completed Epic MUST have E2E tests for the main user journey

## Git
- Branch from `develop`: `feat/US-X.X-description`
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- NEVER commit `.env.local` or secrets

## Important Files
- Schema: `src/db/schema.ts` (23 tables, 23 enums, single source of truth)
- Auth: `src/lib/auth.ts` (Better Auth config)
- PRD: `docs/prd/` (product requirements, UI specs, user stories)
- UI specs: `docs/prd/3-user-interface-design-goals.md`

## MANDATORY WORKFLOW — DO NOT SKIP
1. For ANY User Story implementation: READ `docs/prd/23-mvp-workflow.md` FIRST
2. For ANY DB operation: READ `src/db/schema.ts` FIRST — never guess column names
3. For ANY UI component: READ `docs/prd/3-user-interface-design-goals.md` FIRST
4. ALWAYS plan before coding. Propose files to create/modify, wait for approval.
5. After implementation: run `npx tsc --noEmit`, review your own code for tenantId filtering and error handling.

## IMPORTANT
- Navigation is SIDEBAR ONLY (no horizontal nav)
- No Stripe in V1 (billing is manual: PDF invoice + cash/card/transfer)
- Inspection has 2 versions: MVP (simple form) first, then V1.1 (structured 4 sections)
- Planning uses `planby` library (NOT react-big-calendar)
- All amounts in CHF, NOT EUR
```

---

## 5. Hooks Claude Code

### `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "npx tsc --noEmit --pretty 2>&1 | head -20",
        "description": "Type-check after file changes"
      }
    ]
  },
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(npx tsc:*)",
      "Bash(npx drizzle-kit:*)",
      "Bash(npx vitest:*)",
      "Bash(git diff:*)",
      "Bash(git status:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git checkout:*)",
      "Bash(git branch:*)",
      "Bash(cat:*)",
      "Bash(ls:*)",
      "Bash(grep:*)",
      "Bash(find:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(wc:*)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(sudo:*)"
    ]
  }
}
```

---

## 6. Best Practices Claude Code — Résumé des Power Users

### 🏆 Les 7 règles d'or

**1. CLAUDE.md = cerveau permanent du projet**
- Court et concis (<150 instructions au total, sinon Claude les ignore)
- Uniquement les infos universellement applicables
- Mettre les détails spécifiques dans les **skills** (chargement à la demande)
- Le réviser régulièrement : si Claude fait des erreurs malgré une règle, le fichier est trop long

**2. Planifier AVANT de coder — Plan Mode (Shift+Tab x2)**
- Toujours demander un plan avant l'implémentation
- "Analyse les user stories US-X.X et US-X.X, propose une implémentation. NE CODE PAS encore."
- Reviewer le plan, corriger les malentendus, PUIS valider l'exécution
- Écrire le plan dans un fichier `IMPLEMENTATION_PLAN.md` pour persistance

**3. Contexte = tout**
- `/clear` fréquemment (les longues conversations dégradent la qualité)
- 1 tâche = 1 session (ne pas mélanger "fix le bug X" et "ajoute la feature Y")
- Référencer les fichiers directement : `@src/db/schema.ts` au lieu de "le schéma"
- Passer des screenshots de maquettes quand on travaille sur l'UI

**4. Prompts de qualité**
- Spécifier les fichiers à lire et ceux à modifier
- Donner des contraintes : "max 100 lignes", "pas de librairie externe"
- Donner des critères d'acceptance : "le formulaire doit valider avec Zod côté serveur"
- Référencer les User Stories : "Implémente US-4.1 (Departure Inspection MVP)"

**5. Git comme filet de sécurité**
- TOUJOURS committer avant une grosse modification
- Utiliser des branches feature (`feat/US-X.X-description`)
- Si Claude fait une bêtise : `git checkout -- .` ou `git stash`
- Reviewer le diff avant de committer : "Montre-moi le git diff"

**6. Hooks pour la qualité automatique**
- PostToolUse → type-check automatique après chaque edit
- Pre-commit → lint + format
- Claude peut écrire des hooks : "Écris un hook qui lance ESLint après chaque modification"

**7. Itérer et affiner**
- Demander un code review à Claude sur son propre code : "Review le code que tu viens d'écrire"
- Si le résultat est moyen, ne pas re-prompter la même chose — reformuler avec plus de contexte
- Ajouter les patterns récurrents dans CLAUDE.md ou dans un skill custom

### 🔧 Workflow quotidien recommandé

```
1. Ouvrir Claude Code dans le projet
2. `git status` — vérifier l'état
3. `git checkout -b feat/US-X.X-description` — nouvelle branche
4. Plan Mode : "Lis US-X.X dans docs/prd/. Propose un plan d'implémentation."
5. Reviewer le plan → valider ou corriger
6. "Implémente le plan. Commence par [étape 1]."
7. Après chaque étape : vérifier le type-check + tester manuellement
8. "Écris les unit tests pour les server actions et les Zod schemas."
9. `npx vitest run` — vérifier que tous les tests passent
10. "Review le code que tu viens d'écrire. Vérifie la sécurité et les edge cases."
11. `npm run check` — type-check + lint + tous les tests
12. `git add . && git commit -m "feat: implement US-X.X — description"`
13. Si fin d'Epic : "Écris les tests E2E pour le parcours complet."
14. `npm run e2e` — vérifier les E2E
15. `git push origin feat/US-X.X-description`
16. `/clear` — nettoyer le contexte pour la prochaine tâche
```

### ⚡ Sessions parallèles

Claude Code supporte plusieurs sessions simultanées :
- **Session 1** : Feature development (Epic en cours)
- **Session 2** : Bug fixes / code review
- **Session 3** : Tests / documentation

Chaque session a son propre contexte — ne pas mélanger.

---

## 7. Installation Complète — Checklist

```bash
# 1. Installer les marketplaces officielles
/plugin marketplace add anthropics/skills
/plugin marketplace add supabase/agent-skills
/plugin marketplace add mhattingpete/claude-skills-marketplace

# 2. Installer les skills depuis les marketplaces
/plugin install postgres-best-practices@supabase-agent-skills
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
/plugin install engineering-workflow-plugin@claude-skills-marketplace

# 3. Créer les skills custom LocaFleet
mkdir -p .claude/skills/locafleet-orchestrator
mkdir -p .claude/skills/locafleet-stack
mkdir -p .claude/skills/locafleet-schema
mkdir -p .claude/skills/locafleet-ui
mkdir -p .claude/skills/locafleet-testing
# → Copier les SKILL.md des sections 2 et 3 ci-dessus

# 4. Créer le CLAUDE.md racine
# → Copier la section 4 ci-dessus dans ./CLAUDE.md

# 5. Configurer les hooks
# → Copier la section 5 dans .claude/settings.json

# 6. Vérifier l'installation
# Dans Claude Code, taper :
# "Quels skills as-tu disponibles ?"
# Claude devrait lister tous les skills installés
```

---

## 8. Structure Finale `.claude/`

```
.claude/
├── settings.json              # Hooks + permissions
├── skills/
│   ├── locafleet-orchestrator/
│   │   └── SKILL.md           # Meta-skill routing table
│   ├── locafleet-stack/
│   │   └── SKILL.md           # Stack conventions + file structure
│   ├── locafleet-schema/
│   │   └── SKILL.md           # DB schema reference (@schema.ts)
│   ├── locafleet-ui/
│   │   └── SKILL.md           # Design system + UI patterns (@3-ui.md)
│   └── locafleet-testing/
│       └── SKILL.md           # Testing conventions Vitest + Playwright
└── commands/                  # Custom slash commands
    ├── implement-us.md        # /implement-us <US number> — code + tests
    ├── test-us.md             # /test-us <US number> — write tests only
    ├── review.md              # /review — code review current changes
    └── plan.md                # /plan <feature> — plan before coding
```

### Custom Slash Commands

**`.claude/commands/implement-us.md`**
```markdown
Read the user story $ARGUMENTS from docs/prd/.
First, enter Plan Mode and propose an implementation plan.
Reference the relevant skills (schema, stack, ui).
Wait for my approval before coding.

After implementation:
1. Write unit tests for every Server Action created/modified
2. Write unit tests for every Zod validation schema created/modified
3. Run `npx vitest run` on the new test files to verify they pass
4. Run `npx tsc --noEmit` to verify type safety
5. Review your own code for security (tenantId) and edge cases
```

**`.claude/commands/review.md`**
```markdown
Review all uncommitted changes (git diff).
Check for:
- Type safety (no `any`, proper generics)
- Security (tenantId filtering on EVERY query, auth checks)
- Error handling (no swallowed errors, proper user feedback)
- Swiss formatting (CHF with apostrophe, DD.MM.YYYY dates)
- UI consistency with design system (colors, badges, patterns)
- Test coverage: every new Server Action and Zod schema MUST have tests
- Adherence to LocaFleet conventions from CLAUDE.md
List issues found and suggest fixes.
```

**`.claude/commands/plan.md`**
```markdown
Enter Plan Mode for: $ARGUMENTS
Read relevant user stories from docs/prd/.
Read the schema from src/db/schema.ts.
Propose a detailed implementation plan with:
1. Files to create/modify
2. Components needed
3. Server Actions needed
4. Validation schemas needed
5. Unit tests needed (list each test file and what it tests)
6. E2E scenarios if this completes an Epic
7. Edge cases to handle
DO NOT CODE until I approve the plan.
```

**`.claude/commands/test-us.md`**
```markdown
For the feature related to $ARGUMENTS:
1. Read the acceptance criteria (Gherkin) from docs/prd/
2. Write unit tests for ALL Server Actions in src/actions/ related to this US
3. Write unit tests for ALL Zod schemas in src/lib/validations/ related to this US
4. Write component tests for any new shared components
5. Run all new tests: `npx vitest run` on each new test file
6. Report coverage: which actions/schemas are tested, which are not
7. If this completes an Epic, propose E2E test scenarios (don't write them yet)
```
