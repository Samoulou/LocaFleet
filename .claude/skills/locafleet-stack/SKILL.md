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
