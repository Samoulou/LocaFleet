# 4. Technical Assumptions

## 4.1 Technology Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| Frontend | Next.js (App Router, RSC) | 15+ | Full-stack React, SSR, Server Components |
| Backend (CRUD) | Next.js Server Actions | 15+ | Co-located, type-safe, idéal pour les opérations simples |
| Backend (API) | Hono (monté sur `/api`) | 4.x | Léger, type-safe, pour les jobs lourds (PDF, webhooks, emails) |
| Database + Storage | Supabase (PostgreSQL 16) | — | PostgreSQL managé + PgBouncer + Storage S3-compatible + RLS natif |
| ORM | Drizzle ORM | — | Léger (pas de query engine binary), proche du SQL, type-safe, contrôle total sur les jointures |
| Auth | Better Auth | — | Moderne, type-safe, plugin `organization` pour le multi-tenant RBAC |
| Hosting | Railway | — | Serveur persistant (Node.js 24/7), pas de cold start, pas de timeout, deploy GitHub auto |
| Email | Resend + React Email | — | Transactional emails, templates React, gratuit jusqu'à 3'000 emails/mois |
| File Storage | Supabase Storage | — | S3-compatible, buckets privés (docs clients) et publics (photos véhicules), transformations d'images |
| i18n | next-intl | — | Internationalisation Next.js App Router native |
| PDF | @react-pdf/renderer | — | Génération contrats et factures, composable en React |
| Validation | Zod + react-hook-form | — | Validation type-safe partagée client/serveur |
| Background Jobs | Trigger.dev (ou BullMQ) | — | Tâches async : génération PDF, envoi email, cleanup |

> **Note Paiements :** Pas de paiement en ligne dans l'application. La facturation est gérée en interne avec génération de factures PDF et quittancement manuel (espèces, carte, virement). Si le besoin d'un paiement en ligne émerge en V2+, Stripe Checkout pourra être intégré.

### Coût mensuel estimé (production)

| Service | Coût |
|---------|------|
| Railway (app) | ~5-10 $/mois |
| Supabase (Free → Pro) | 0 → 25 $/mois |
| Resend | 0 (< 3'000 emails/mois) |
| Domaine | ~15 $/an |
| **Total V1** | **~5-35 $/mois** |

## 4.2 Architecture Overview

```
┌──────────────┐     ┌──────────────────────────────────────┐
│   Browser    │────▶│         Railway (Node.js 24/7)        │
│  (Next.js    │     │                                        │
│   Client)    │     │  ┌─────────────────────────────────┐  │
└──────────────┘     │  │  Next.js App Router              │  │
                     │  │                                   │  │
                     │  │  Server Components (RSC)          │  │
                     │  │  Server Actions (CRUD)            │  │
                     │  │  Hono Router (/api/*)             │  │
                     │  │    ├─ Génération PDF              │  │
                     │  │    └─ Email triggers              │  │
                     │  └──────────┬──────────────────────┘  │
                     │             │                          │
                     │  ┌──────────▼──────────┐              │
                     │  │   Drizzle ORM       │              │
                     │  └──────────┬──────────┘              │
                     └─────────────┼──────────────────────────┘
                                   │
                     ┌─────────────┼──────────────────────────┐
                     │  Supabase   │                          │
                     │             ▼                          │
                     │  ┌──────────────────────┐             │
                     │  │  PostgreSQL 16        │             │
                     │  │  (PgBouncer pooling)  │             │
                     │  │  (RLS tenant_id)      │             │
                     │  └──────────────────────┘             │
                     │                                        │
                     │  ┌──────────────────────┐             │
                     │  │  Supabase Storage     │             │
                     │  │  (S3-compatible)       │             │
                     │  │  ├─ photos/ (public)   │             │
                     │  │  └─ documents/ (privé)  │             │
                     │  └──────────────────────┘             │
                     └────────────────────────────────────────┘

                     ┌────────────────────────────────────────┐
                     │  Services externes                     │
                     │  ┌──────────────────────┐              │
                     │  │  Resend (Email)       │              │
                     │  └──────────────────────┘              │
                     └────────────────────────────────────────┘
```

### Pourquoi cette architecture

- **Railway (serveur persistant)** : le processus Node.js tourne 24/7 — pas de cold start le lundi matin, pas de timeout de 10s sur la génération PDF, coût prévisible et bas.
- **Hono sur `/api`** : sépare clairement le CRUD (Server Actions) des opérations métier lourdes (génération PDF, envoi email au mécanicien). Prépare aussi l'API pour le portail client V2.
- **Supabase comme plateforme data** : un seul service pour la DB + le storage + le RLS. Connection pooling via PgBouncer intégré = pas de problèmes de connexion.
- **Drizzle** : pas de query engine binary (contrairement à Prisma), requêtes SQL plus prévisibles, excellent pour les jointures complexes (planning avec 50+ véhicules).

## 4.3 Multi-Tenancy Strategy

L'application est conçue mono-entreprise pour la V1 mais architecturée pour évoluer en SaaS multi-tenant.

### Approach : Shared Database, Tenant Isolation via RLS

- Chaque table métier contient une colonne `tenant_id` (UUID, NOT NULL)
- **Row Level Security (RLS) activé dès la V1** sur Supabase — le filtrage par tenant est garanti au niveau PostgreSQL, pas juste au niveau applicatif
- Drizzle query helper qui injecte le `tenant_id` automatiquement
- En V1, un seul tenant existe, mais le schema et la sécurité sont prêts

```typescript
// Drizzle schema example
export const vehicles = pgTable('vehicles', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  brand: varchar('brand', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  plateNumber: varchar('plate_number', { length: 20 }).notNull(),
  mileage: integer('mileage').notNull(),
  categoryId: uuid('category_id').references(() => vehicleCategories.id),
  status: vehicleStatusEnum('status').default('available').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
```

### RLS Policy (Supabase)
```sql
-- Chaque utilisateur ne voit que les données de son tenant
CREATE POLICY "tenant_isolation" ON vehicles
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### Migration path vers SaaS (V2+)
1. Ajouter un écran d'onboarding tenant
2. RLS déjà actif — rien à changer côté sécurité
3. Ajouter un système de billing par tenant (Stripe Subscriptions)
4. Ajouter un domaine custom ou sous-domaine par tenant

## 4.4 Authentication & Authorization

### Auth Flow
- Better Auth avec credentials provider (email + password) en V1
- Extensible vers OAuth (Google, Microsoft) en V2

### Roles & Permissions

| Role | Dashboard | Véhicules | Clients | Contrats | Facturation | Settings |
|------|-----------|-----------|---------|----------|-------------|----------|
| Admin | Full | Full CRUD | Full CRUD | Full CRUD | Full + quittancer | Full |
| Agent | View | View + Edit status | Full CRUD | Create + Edit | View only | — |
| Viewer | View | View only | View only | View only | View only | — |

### Implementation
- Rôle stocké dans la table `User` (enum: ADMIN, AGENT, VIEWER)
- Middleware Next.js pour protéger les routes
- Server Actions vérifient le rôle avant exécution

## 4.5 File Storage Strategy

| Type | Format | Max Size | Storage |
|------|--------|----------|---------|
| Photos véhicules | JPEG, PNG, WebP | 10 MB | Supabase Storage (bucket `photos`) |
| Documents clients (permis, ID) | JPEG, PNG, PDF | 5 MB | Supabase Storage (bucket `documents`, privé) |
| Photos états des lieux | JPEG, PNG | 10 MB | Supabase Storage (bucket `inspections`) |
| Contrats PDF générés | PDF | — | Supabase Storage (bucket `contracts`, privé) |
| Signatures | PNG (canvas export) | — | Base64 in DB ou Supabase Storage |

## 4.6 Database Schema — Core Entities

> **Total : 23 tables, 23 enums** — voir `src/db/schema.ts` pour la source de verite.

```
Tenant ──┬── User
         ├── Vehicle ──── VehicleCategory
         │      ├── MaintenanceRecord
         │      ├── VehiclePhoto
         │      └── Inspection ──┬── InspectionPhoto
         │                       └── InspectionDamage
         ├── Client ──── ClientDocument
         ├── RentalContract ──┬── ContractOption
         │      │             └── Inspection
         │      ├── Invoice ──── Payment
         │      └── RentalDossier (archived)
         ├── EmailLog
         ├── Notification
         └── AuditLog
```

## 4.7 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SSR vs CSR | RSC par défaut, CSR pour interactivité | Performance, SSR pour vitesse de chargement |
| State management | React Server Components + URL state | Pas besoin de Redux/Zustand pour un back-office |
| Form handling | react-hook-form + zod | Validation type-safe, performant |
| API strategy | Server Actions (CRUD) + Hono (jobs lourds) | Séparation claire, type safety, API ready pour V2 |
| Planning/Gantt | planby | Timeline horizontale React, léger, customisable, parfait pour la vue véhicules |
| Date handling | date-fns | Léger, tree-shakeable, i18n-friendly |
| PDF approach | @react-pdf/renderer | Composable, React-based, styling flexible |
| Email | Resend + React Email | Templates en React, preview facile |
| Payments | Aucun (V1) | Facturation manuelle avec génération PDF et quittancement. Pas de paiement en ligne |
| Hosting model | Serveur persistant (Railway) | Pas de cold start, pas de timeout, idéal pour back-office |
| ORM | Drizzle (vs Prisma) | Plus léger, plus proche du SQL, meilleur contrôle jointures |
