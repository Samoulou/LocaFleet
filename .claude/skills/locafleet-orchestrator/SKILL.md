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

1. **ALWAYS read `locafleet-schema` before any DB operation** - never guess table/column names
2. **ALWAYS read `locafleet-ui` before any UI component** - follow the design system exactly
3. **ALWAYS read `locafleet-stack` for conventions** - file naming, folder structure, error handling
4. **ALWAYS write unit tests for Server Actions and Zod schemas** - no action without a test
5. **Combine skills** - most tasks need 2-3 skills simultaneously
6. **When in doubt, check the PRD** - files in `docs/prd/` are the source of truth
7. **Format suisse** - Dates: DD.MM.YYYY, Montants: 1'250.00 CHF, Langue par defaut: FR
