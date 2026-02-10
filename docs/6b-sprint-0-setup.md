# 6b. Sprint 0 — Setup & Pré-requis

> **Goal:** Préparer tout l'environnement technique avant de commencer l'Epic 1 : infra, DB, auth, tests, Claude Code, sécurité de base, et logging. Sprint 0 n'est pas un vrai sprint de dev — c'est une checklist de setup à exécuter en ~5h.

---

## 🔴 Bloquant — Must avant la première ligne de code

### US-0.1: Création du Repository GitHub

**As a** developer
**I want** a GitHub repository with a clean structure and branch strategy
**So that** the codebase is versioned and ready for collaboration

**Acceptance Criteria:**
```gherkin
Given I create a new GitHub repository "locafleet"
When the repo is initialized
Then it has:
  - A .gitignore for Next.js (node_modules, .next, .env.local, etc.)
  - A README.md with le nom du projet et un lien vers le PRD
  - Branch protection on `main` (no direct push)
  - Branche `develop` créée depuis `main`

Given the branching strategy is defined
When a developer works on une feature
Then il crée une branche `feat/US-X.X-description` depuis `develop`
And il merge via Pull Request avec au moins 1 review (ou self-merge si solo dev)
```

**Checklist:**
- [x] Repo créé sur GitHub (privé)
- [x] `.gitignore` Next.js
- [x] `README.md` minimal
- [x] Branche `main` + `develop`
- [x] Branch protection activée sur `main`

---

### US-0.2: Création des Comptes Services Externes

**As a** developer
**I want** all external service accounts created and API keys collected
**So that** I can configure the app environment variables

**Acceptance Criteria:**
```gherkin
Given I need to create service accounts
When I sign up on each platform
Then I have the following ready:

-- Supabase --
Given I create a Supabase project "locafleet"
When the project is provisioned
Then I have:
  - DATABASE_URL (connection pooling via PgBouncer, port 6543)
  - DIRECT_URL (direct connection, port 5432, for migrations)
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY

-- Railway --
Given I create a Railway project "locafleet"
When the project is created
Then I have:
  - Un service lié au repo GitHub (auto-deploy sur push)
  - Variables d'environnement configurables dans le dashboard

-- Resend --
Given I create a Resend account
When the account is active
Then I have:
  - RESEND_API_KEY
  - Un domaine vérifié (ou utiliser onboarding@resend.dev pour le dev)
```

**Checklist:**
- [x] Supabase : projet créé, credentials notées
- [x] Railway : projet créé, lié au repo GitHub
- [x] Resend : compte créé, API key générée
- [x] Toutes les clés stockées dans un `.env.example` (sans valeurs) et `.env.local` (avec valeurs, gitignored)

---

### US-0.3: Initialisation du Projet Next.js

**As a** developer
**I want** a fully bootstrapped Next.js 15 project with all core dependencies installed
**So that** I can start coding Epic 1 immédiatement

**Acceptance Criteria:**
```gherkin
Given I run the project scaffolding
When all dependencies are installed
Then `npm run dev` démarre sur localhost:3000 sans erreur

Given the project structure is created
When I inspect the folder tree
Then je vois:
  src/
  ├── app/              # Next.js App Router
  │   ├── (auth)/       # Routes publiques (login)
  │   ├── (dashboard)/  # Routes protégées (sidebar layout)
  │   ├── api/          # Hono API routes
  │   └── layout.tsx    # Root layout
  ├── components/       # Composants réutilisables
  │   ├── ui/           # shadcn/ui components
  │   └── shared/       # Composants métier partagés
  ├── db/
  │   ├── schema.ts     # Drizzle schema complet
  │   ├── index.ts      # DB connection
  │   └── seed.ts       # Seed data
  ├── lib/              # Utilitaires (auth, utils, constants)
  ├── hooks/            # Custom React hooks
  ├── types/            # TypeScript types partagés
  └── i18n/             # Fichiers de traduction (fr, en)
```

**Dépendances à installer :**

```json
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "drizzle-orm": "latest",
    "better-auth": "latest",
    "hono": "^4.x",
    "@hono/node-server": "latest",
    "next-intl": "latest",
    "@react-pdf/renderer": "latest",
    "react-hook-form": "latest",
    "@hookform/resolvers": "latest",
    "zod": "latest",
    "date-fns": "latest",
    "recharts": "latest",
    "planby": "latest",
    "react-signature-canvas": "latest",
    "lucide-react": "latest",
    "sonner": "latest",
    "resend": "latest",
    "@react-email/components": "latest",
    "pino": "latest",
    "xlsx": "latest",
    "isomorphic-dompurify": "latest",
    "browser-image-compression": "latest"
  },
  "devDependencies": {
    "drizzle-kit": "latest",
    "typescript": "^5.x",
    "@types/react": "latest",
    "@types/node": "latest",
    "tailwindcss": "^3.x",
    "postcss": "latest",
    "autoprefixer": "latest",
    "vitest": "latest",
    "@vitejs/plugin-react": "latest",
    "@testing-library/react": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/user-event": "latest",
    "jsdom": "latest",
    "@vitest/coverage-v8": "latest",
    "@vitest/ui": "latest",
    "@playwright/test": "latest",
    "pino-pretty": "latest"
  }
}
```

**Checklist:**
- [x] `npx create-next-app@latest` avec App Router + TypeScript + Tailwind
- [x] `npx shadcn@latest init` (style: default, base color: slate)
- [x] Toutes les dépendances ci-dessus installées
- [x] Structure de dossiers créée
- [x] `npm run dev` fonctionne sans erreur
- [x] `npm run build` passe sans erreur

---

### US-0.4: Configuration Drizzle + Push Schema

**As a** developer
**I want** the complete database schema applied to Supabase
**So that** all tables are ready pour le développement des Epics

**Acceptance Criteria:**
```gherkin
Given le schema.ts est copié dans src/db/schema.ts
When je configure drizzle.config.ts avec les credentials Supabase
Then le fichier de config pointe vers la DIRECT_URL pour les migrations

Given je run `npx drizzle-kit push`
When la commande termine
Then les 21 tables sont créées dans Supabase:
  - tenants, users, sessions, accounts, verifications
  - vehicles, vehicle_categories, vehicle_photos, maintenance_records
  - clients, client_documents, rental_options, rental_contracts, contract_options
  - inspections, inspection_photos, inspection_damages
  - invoices, payments, rental_dossiers
  - email_logs, notifications, audit_logs
And les 18 enums sont créés
And tous les indexes sont en place

Given je configure la connexion poolée pour l'app
When l'app se connecte
Then elle utilise DATABASE_URL (PgBouncer, port 6543) pour les requêtes
And DIRECT_URL (port 5432) uniquement pour les migrations
```

**Fichier `drizzle.config.ts` :**
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
});
```

**Checklist:**
- [x] `drizzle.config.ts` créé
- [x] `src/db/index.ts` avec connexion poolée (DATABASE_URL)
- [x] `npx drizzle-kit push` exécuté avec succès
- [x] Vérifier dans Supabase Dashboard → Table Editor que toutes les tables existent
- [x] Tester une requête simple (select from tenants) depuis l'app

---

### US-0.5: Configuration Better Auth + Seed Admin User

**As a** developer
**I want** Better Auth configured with email/password credentials
**So that** I can login as admin and test the protected routes

**Acceptance Criteria:**
```gherkin
Given Better Auth is configured
When I set up the auth config
Then it uses:
  - Drizzle adapter pointing to the users/sessions/accounts tables
  - Email + password credentials provider
  - Session strategy with secure cookies

Given I run the seed script
When the seed completes
Then the following data exists in the database:
  - 1 tenant: "LocaFleet Demo" (slug: "demo")
  - 1 admin user: admin@locafleet.ch / password configurable via env
  - 1 agent user: agent@locafleet.ch / password configurable via env
  - 1 viewer user: viewer@locafleet.ch / password configurable via env

Given I navigate to /login
When I enter admin@locafleet.ch and the password
Then I am redirected to /dashboard
And my session is active

Given I am not logged in
When I try to access /dashboard
Then I am redirected to /login
```

**Fichier `src/db/seed.ts` (structure) :**
```typescript
// 1. Create demo tenant
// 2. Create admin user (role: admin)
// 3. Create agent user (role: agent)
// 4. Create viewer user (role: viewer)
// 5. Create 3-4 vehicle categories (Citadine, Berline, SUV, Utilitaire)
// 6. Create 5-10 sample vehicles with different statuses
// 7. Create 5-10 sample clients
```

**Checklist:**
- [x] `src/lib/auth.ts` — Better Auth config avec Drizzle adapter
- [x] `src/app/api/auth/[...all]/route.ts` — Auth API route
- [x] `src/db/seed.ts` — Seed script fonctionnel
- [x] `npx tsx src/db/seed.ts` exécuté avec succès
- [x] Login/logout fonctionnel sur /login
- [x] Middleware Next.js protégeant les routes `/(dashboard)/**`
- [x] Redirection automatique vers /login si non authentifié

---

## 🔴 Bloquant (suite) — Requis pour le workflow de dev

### US-0.6: ESLint + Prettier + Conventions

**As a** developer
**I want** consistent code formatting and linting rules
**So that** `npm run check` (tsc + lint + tests) fonctionne et le code reste propre

**Acceptance Criteria:**
```gherkin
Given ESLint and Prettier are configured
When I save a file in VS Code
Then le fichier est auto-formatté selon les règles

Given I run `npm run lint`
When des violations existent
Then elles sont listées avec la règle et le fichier

Given le projet a des conventions définies
When un nouveau développeur rejoint
Then il lui suffit d'installer les extensions VS Code recommandées
```

**Conventions :**
- Indentation: 2 spaces
- Quotes: double (TypeScript convention)
- Semicolons: yes
- Trailing commas: es5
- Import order: react → next → libraries → @/ aliases → relative
- Naming: camelCase (variables/functions), PascalCase (components/types), snake_case (DB columns)

**Checklist:**
- [x] `.eslintrc.json` configuré (extends: next/core-web-vitals + typescript)
- [x] `.prettierrc` créé
- [x] `.vscode/extensions.json` avec recommandations (ESLint, Prettier, Tailwind IntelliSense)
- [x] `.vscode/settings.json` avec format on save
- [x] `npm run lint` passe sans erreur
- [x] Path aliases configurés dans `tsconfig.json` (`@/*` → `./src/*`)

---

### US-0.7: Configuration Vitest + Playwright

**As a** developer
**I want** Vitest (unit tests) and Playwright (E2E) fully configured
**So that** I can write and run tests dès la première US

**Acceptance Criteria:**
```gherkin
Given Vitest is configured
When I run `npm run test`
Then Vitest runs with jsdom environment, path aliases, and coverage enabled
And the setup file mocks DB and Auth automatically

Given Playwright is configured
When I run `npm run e2e`
Then Playwright launches Chromium, starts the dev server, and runs tests
And the auth setup logs in as admin and saves the session for reuse

Given I run `npm run check`
When the command completes
Then it runs sequentially: tsc --noEmit → lint → vitest run
```

**Fichiers à créer :**

`vitest.config.ts` — Voir doc `15-testing-strategy.md` section 4

`src/__tests__/setup.ts` — Mock DB + Auth pour tous les tests unitaires

`playwright.config.ts` — Voir doc `15-testing-strategy.md` section 5

`e2e/auth.setup.ts` — Login partagé admin (storageState)

`e2e/fixtures/helpers.ts` — Utilitaires Playwright

**Scripts `package.json` :**
```json
{
  "scripts": {
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

**Checklist:**
- [x] `vitest.config.ts` créé avec jsdom + path aliases + coverage config
- [x] `src/__tests__/setup.ts` créé avec mock DB + mock Auth
- [x] `playwright.config.ts` créé avec Chromium + mobile + webServer
- [x] `e2e/auth.setup.ts` créé avec login admin + storageState
- [x] `e2e/.auth/` ajouté au `.gitignore`
- [x] `npx playwright install chromium` exécuté
- [x] `npm run test` passe (0 tests, 0 erreurs)
- [x] `npm run check` passe (tsc + lint + test)
- [x] Écrire 1 test unitaire de smoke : `src/__tests__/utils/format-chf.test.ts`
- [x] Le test de smoke passe : `npx vitest run src/__tests__/utils/format-chf.test.ts`

---

### US-0.8: Configuration Claude Code (Skills + Commands + Hooks)

**As a** developer
**I want** Claude Code configured with custom skills, slash commands, and hooks
**So that** `/implement-us`, `/review`, `/test-us`, `/plan` fonctionnent et les skills LocaFleet sont actifs

**Acceptance Criteria:**
```gherkin
Given I open Claude Code in the project
When Claude starts a session
Then it reads CLAUDE.md and knows the project stack, conventions, and rules
And it detects 5 custom skills in .claude/skills/
And it has 4 slash commands available

Given I type `/implement-us US-3.1`
When Claude processes the command
Then it reads the PRD, loads relevant skills, and proposes a plan before coding

Given Claude modifies a file
When the edit is saved
Then the PostToolUse hook runs `npx tsc --noEmit` automatically

Given I type `/review`
When Claude processes the command
Then it runs git diff and reviews for security, tests, formatting, and conventions
```

**Fichiers à créer :**

**1. `CLAUDE.md` (racine du projet)**
→ Copier depuis `14-claude-code-setup-guide.md` section 4

**2. `.claude/settings.json` (hooks + permissions)**
→ Copier depuis `17-claude-code-advanced-orchestration.md` section 1 (block-at-commit)
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(git commit)",
        "command": "test -f /tmp/locafleet-pre-commit-pass || (echo 'BLOCK: Run npm run check first.' && exit 1)"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "npx prettier --write $CLAUDE_FILE_PATH 2>/dev/null || true"
      }
    ]
  }
}
```

**3. Custom Skills (5 SKILL.md)**
→ Copier depuis `14-claude-code-setup-guide.md` sections 2 et 3

| Skill | Fichier | Contenu |
|-------|---------|---------|
| Orchestrateur | `.claude/skills/locafleet-orchestrator/SKILL.md` | Routing table → quel skill pour quelle tâche |
| Stack | `.claude/skills/locafleet-stack/SKILL.md` | Conventions, file structure, patterns Server Actions |
| Schema | `.claude/skills/locafleet-schema/SKILL.md` | Référence des 21 tables, enums, indexes |
| UI | `.claude/skills/locafleet-ui/SKILL.md` | Design system, couleurs, patterns A/B/C/D |
| Testing | `.claude/skills/locafleet-testing/SKILL.md` | Conventions Vitest + Playwright, patterns de tests |

**4. Slash Commands (4 fichiers .md)**
→ Copier depuis `14-claude-code-setup-guide.md` section 8

| Commande | Fichier | Usage |
|----------|---------|-------|
| `/implement-us` | `.claude/commands/implement-us.md` | Plan + code + tests + review |
| `/test-us` | `.claude/commands/test-us.md` | Écrire les tests d'une US |
| `/review` | `.claude/commands/review.md` | Code review automatique |
| `/plan` | `.claude/commands/plan.md` | Planifier sans coder |

**5. Installation des Skill Marketplaces (dans Claude Code)**
```
/plugin marketplace add anthropics/skills
/plugin marketplace add supabase/agent-skills
/plugin marketplace add mhattingpete/claude-skills-marketplace

/plugin install postgres-best-practices@supabase-agent-skills
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
/plugin install engineering-workflow-plugin@claude-skills-marketplace
```

**6. Subagents (3 fichiers .md)**
→ Copier depuis `17-claude-code-advanced-orchestration.md` section 2

| Subagent | Fichier | Rôle |
|----------|---------|------|
| Security Reviewer | `.claude/agents/security-reviewer.md` | Audit tenantId, auth, injection, XSS |
| Test Writer | `.claude/agents/test-writer.md` | Écrire tests Vitest selon les conventions |
| DB Analyst | `.claude/agents/db-analyst.md` | Performance queries, N+1, indexes |

**7. Script pre-commit check**
→ Copier depuis `17-claude-code-advanced-orchestration.md` section 1
```bash
# scripts/pre-commit-check.sh
rm -f /tmp/locafleet-pre-commit-pass
npm run check && touch /tmp/locafleet-pre-commit-pass
```

**Checklist:**
- [x] `CLAUDE.md` créé à la racine du projet
- [x] `.claude/settings.json` créé avec hooks block-at-commit + Prettier
- [x] `scripts/pre-commit-check.js` créé (Node.js cross-platform)
- [x] `.claude/agents/security-reviewer.md` créé
- [x] `.claude/agents/test-writer.md` créé
- [x] `.claude/agents/db-analyst.md` créé
- [x] `.claude/skills/locafleet-orchestrator/SKILL.md` créé
- [x] `.claude/skills/locafleet-stack/SKILL.md` créé
- [x] `.claude/skills/locafleet-schema/SKILL.md` créé
- [x] `.claude/skills/locafleet-ui/SKILL.md` créé
- [x] `.claude/skills/locafleet-testing/SKILL.md` créé
- [x] `.claude/commands/implement-us.md` créé
- [x] `.claude/commands/test-us.md` créé
- [x] `.claude/commands/review.md` créé
- [x] `.claude/commands/plan.md` créé
- [x] `.claude/commands/sprint.md` créé
- [ ] Marketplaces ajoutées dans Claude Code (3 marketplaces) — manuel
- [ ] Skills installés depuis les marketplaces (4 skills) — manuel
- [x] Vérifier : ouvrir Claude Code → "Quels skills as-tu ?" → il liste tous les skills
- [x] Vérifier : taper `/` → les 5 commandes apparaissent dans l'autocomplétion
- [x] Vérifier : modifier un fichier → Prettier formate automatiquement (non-bloquant)
- [x] Vérifier : tenter `git commit` sans `npm run check` → bloqué par hook

---

### US-0.9: Documentation PRD dans le Projet

**As a** developer
**I want** the PRD documentation inside the project repository
**So that** Claude Code can reference it via `@docs/prd/` and the skills can point to it

**Acceptance Criteria:**
```gherkin
Given the PRD is in the repository
When Claude needs to read an Epic's user stories
Then it can access them at docs/prd/8-epic-3-clients-contracts.md (etc.)

Given the schema reference skill points to @docs/prd/
When Claude loads the skill
Then it finds the actual files and reads them
```

**Structure :**
```
docs/
└── prd/
    ├── index.md
    ├── 1-goals-and-background-context.md
    ├── 2-requirements.md
    ├── 3-user-interface-design-goals.md
    ├── 4-technical-assumptions.md
    ├── 5-epic-list.md
    ├── 6-epic-1-foundation-auth.md
    ├── 6b-sprint-0-setup.md
    ├── 7-epic-2-fleet-management.md
    ├── 8-epic-3-clients-contracts.md
    ├── 9-epic-4-inspections-planning.md
    ├── 10-epic-5-billing-dashboard.md
    ├── 11-epic-6-notifications-email.md
    ├── 12-checklist-results-report.md
    ├── 13-next-steps.md
    ├── 14-claude-code-setup-guide.md
    ├── 15-testing-strategy.md
    ├── 16-workflow-developpement-us.md
    ├── change-log.md
    └── schema.ts
```

**Checklist:**
- [ ] Dossier `docs/prd/` créé dans le projet
- [ ] Tous les fichiers PRD copiés depuis les livrables
- [ ] `schema.ts` accessible dans `docs/prd/schema.ts` (référence, le vrai est dans `src/db/schema.ts`)
- [ ] Vérifier : dans Claude Code, `@docs/prd/index.md` ouvre le fichier correctement
- [ ] `docs/` committé sur `develop` (c'est de la documentation, pas du code)

---

## 🟡 Nice-to-have — Sprint 1 (pas bloquant pour le workflow)

### US-0.10: CI/CD Pipeline GitHub Actions → Railway

**As a** developer
**I want** automatic deployments on push to develop/main
**So that** I don't have to deploy manually

**Acceptance Criteria:**
```gherkin
Given I push to the `develop` branch
When GitHub Actions runs
Then:
  - TypeScript type-check passes (`tsc --noEmit`)
  - ESLint passes
  - Unit tests pass (`vitest run`)
  - Build passes (`next build`)
  - Si tout est vert, Railway déploie automatiquement le staging

Given I merge a PR into `main`
When the merge completes
Then Railway déploie automatiquement la production
```

**Pipeline `.github/workflows/ci.yml` :**
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
      - run: npm run check
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: check
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

**Checklist:**
- [ ] `.github/workflows/ci.yml` créé
- [ ] Railway configuré pour auto-deploy depuis GitHub (develop → staging, main → production)
- [ ] Premier deploy réussi (app accessible via URL Railway)
- [ ] Variables d'environnement configurées dans Railway dashboard

---

### US-0.11: Error Tracking avec Sentry

**As a** developer
**I want** automatic error tracking in production
**So that** I catch bugs before users report them

**Acceptance Criteria:**
```gherkin
Given Sentry is configured
When an unhandled error occurs in production
Then it is captured and visible dans le Sentry dashboard
And l'erreur inclut: stack trace, user info (rôle, tenant), URL, browser

Given I install @sentry/nextjs
When I run the Sentry wizard
Then les fichiers de config sont créés:
  - sentry.client.config.ts
  - sentry.server.config.ts
  - sentry.edge.config.ts
  - next.config.js updated with Sentry plugin
```

**Checklist:**
- [ ] Compte Sentry créé (free tier)
- [ ] `npx @sentry/wizard@latest -i nextjs`
- [ ] `SENTRY_DSN` ajouté aux variables d'environnement
- [ ] Test : throw une erreur manuellement, vérifier qu'elle apparaît dans Sentry
- [ ] Source maps uploadées pour des stack traces lisibles

---

### US-0.12: Choix du Nom Définitif

**As a** product owner
**I want** to decide on the final application name
**So that** branding is consistent from day one

**Acceptance Criteria:**
```gherkin
Given "LocaFleet" is a placeholder name
When the final name is decided
Then il est mis à jour dans:
  - package.json (name)
  - README.md
  - CLAUDE.md
  - Login page (logo + tagline)
  - Sidebar header
  - Email templates (sender name)
  - Browser tab title (next-intl metadata)
  - Supabase project name (optionnel)
  - GitHub repo name (optionnel)

Given le nom est choisi
When je vérifie la disponibilité
Then le domaine .ch est disponible (ou une alternative)
And le nom ne pose pas de problème de marque en Suisse
```

**Checklist:**
- [ ] Brainstorm 3-5 options de noms avec V1ls
- [ ] Vérifier disponibilité domaine (.ch, .com)
- [ ] Vérifier sur le registre des marques suisse (swissreg.ch)
- [ ] Décision finale prise
- [ ] Mettre à jour tous les fichiers mentionnés ci-dessus

---

## Résumé Sprint 0

### Ordre d'exécution

```
US-0.1  Repo GitHub
  └─▶ US-0.2  Comptes (Supabase, Railway, Resend)
        └─▶ US-0.3  Init Next.js + toutes les deps (y compris Vitest, Playwright)
              ├─▶ US-0.4  Drizzle + Push Schema (21 tables)
              ├─▶ US-0.6  ESLint + Prettier (requis pour `npm run check`)
              └─▶ US-0.7  Config Vitest + Playwright (requis pour tests)
                    └─▶ US-0.5  Better Auth + Seed Admin (besoin de la DB)
                          └─▶ US-0.9  Copier PRD dans docs/
                                └─▶ US-0.8  Claude Code (CLAUDE.md + skills + commands + hooks)
                                      └─▶ ✅ PRÊT — /implement-us fonctionne
```

### Tableau récapitulatif

| US | Titre | Priorité | Effort | Dépend de | Statut |
|----|-------|----------|--------|-----------|--------|
| US-0.1 | Repo GitHub | 🔴 Bloquant | 15 min | — | ✅ |
| US-0.2 | Comptes services externes | 🔴 Bloquant | 30 min | US-0.1 | ✅ |
| US-0.3 | Init projet Next.js + deps | 🔴 Bloquant | 30 min | US-0.1 | ✅ |
| US-0.4 | Drizzle + Push Schema | 🔴 Bloquant | 30 min | US-0.2, US-0.3 | ✅ |
| US-0.5 | Better Auth + Seed Admin | 🔴 Bloquant | 1-2h | US-0.4 | ✅ |
| US-0.6 | ESLint + Prettier | 🔴 Bloquant | 20 min | US-0.3 | ✅ |
| US-0.7 | Config Vitest + Playwright | 🔴 Bloquant | 30 min | US-0.3 | ✅ |
| US-0.8 | Claude Code (skills + commands + hooks) | 🔴 Bloquant | 45 min | US-0.9 | ✅ |
| US-0.9 | PRD docs dans le projet | 🔴 Bloquant | 15 min | US-0.5 | ✅ |
| US-0.10 | CI/CD GitHub → Railway | 🟡 Sprint 1 | 1h | US-0.7 | ⬜ |
| US-0.11 | Sentry error tracking | 🟡 Sprint 1 | 30 min | US-0.3 | ⬜ |
| US-0.12 | Nom définitif | 🟡 Avant launch | — | — | ⬜ |

**Temps total bloquant : ~4-5h**
**Temps total nice-to-have : ~1h30**

### Vérification finale

Avant de passer à l'Epic 1, vérifier que TOUT fonctionne :

- [x] `npm run dev` → app tourne sur localhost:3000
- [x] Login admin@locafleet.ch → redirection /dashboard
- [x] `npm run check` → tsc ✅ + lint ✅ + tests ✅ (au moins 1 smoke test)
- [x] `npm run e2e` → Playwright instancié (0 tests encore, mais pas d'erreur)
- [x] Claude Code → `CLAUDE.md` chargé, skills détectés, `/implement-us` disponible
- [x] `docs/prd/` accessible depuis Claude Code via `@docs/prd/index.md`
- [x] Hook Prettier → modifier un fichier, Prettier auto-format
- [x] Hook block-at-commit → `git commit` sans avoir lancé check → bloqué ✅
