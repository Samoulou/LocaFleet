# LocaFleet

Swiss car rental fleet management back-office (30-100 vehicles).

## Stack
Next.js 15 (App Router) + Drizzle ORM + Supabase (PostgreSQL 16) + Better Auth + Hono + Railway

## Commands
- `npm run dev` — Start dev server (localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run format` — Prettier format all files
- `npx tsc --noEmit` — Type check
- `npx drizzle-kit push` — Push schema to Supabase (uses DIRECT_URL)
- `npx drizzle-kit generate` — Generate migration files
- `npx tsx src/db/seed.ts` — Seed database
- `npm run check` — Full check: tsc + lint + unit tests
- `node scripts/pre-commit-check.js` — Run checks and enable git commit

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
- EVERY Server Action MUST have a unit test
- EVERY Zod schema MUST have a unit test
- EVERY completed Epic MUST have E2E tests for the main user journey

## Git
- Branch from `develop`: `feat/US-X.X-description`
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- NEVER commit `.env.local` or secrets
- Run `node scripts/pre-commit-check.js` before committing

## Important Files
- Schema: `src/db/schema.ts` (21 tables, single source of truth)
- Auth: `src/lib/auth.ts` (Better Auth config)
- PRD: `docs/prd/` (product requirements, UI specs, user stories)
- UI specs: `docs/prd/3-user-interface-design-goals.md`

## MANDATORY WORKFLOW - DO NOT SKIP
1. For ANY User Story implementation: READ the relevant epic file in `docs/prd/` FIRST
2. For ANY DB operation: READ `src/db/schema.ts` FIRST - never guess column names
3. For ANY UI component: READ `docs/prd/3-user-interface-design-goals.md` FIRST
4. ALWAYS plan before coding. Propose files to create/modify, wait for approval.
5. After implementation: run `npx tsc --noEmit`, review your own code for tenantId filtering and error handling.
6. ALWAYS write unit tests for Server Actions and Zod schemas before considering the task done.

## IMPORTANT
- Navigation is SIDEBAR ONLY (no horizontal nav)
- No Stripe in V1 (billing is manual: PDF invoice + cash/card/transfer)
- Inspection has 2 versions: MVP (simple form) first, then V1.1 (structured 4 sections)
- Planning uses `planby` library (NOT react-big-calendar)
- All amounts in CHF, NOT EUR
- Swiss formatting: 1'250.00 CHF (apostrophe), dates DD.MM.YYYY
