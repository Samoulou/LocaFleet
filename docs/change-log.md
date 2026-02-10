# Change Log

## [1.2.0] — 2026-02-08

### Changed
- Navigation: sidebar-only (suppression de toute navigation horizontale)
- Inspection: split en MVP (V1.0) et Version Finale (V1.1)
- Planning: react-big-calendar → **planby** (Gantt timeline)
- UI Design Goals: refonte complète avec spécifications dev détaillées (couleurs, spacing, patterns, composants)
- Ajout évaluation de readiness dev (score 8.6/10 — ready to start)

### Removed
- Stripe: aucune intégration paiement en V1

## [1.1.0] — 2026-02-08

### Changed
- Stack: Vercel → **Railway**, Neon → **Supabase**, Prisma → **Drizzle ORM**
- Storage: Vercel Blob → **Supabase Storage**
- Backend: ajout **Hono** pour API Routes lourdes
- Payments: Stripe Connect → supprimé en V1 (facturation manuelle)
- Auth: NextAuth.js → **Better Auth**
- Inspections: schéma interactif SVG → photos + commentaires texte

## [1.0.0] — 2026-02-06

### Added
- Initial PRD creation
- 6 epics with ~56 user stories
- Goals & background context
- Functional & non-functional requirements
- UI/UX design goals
- Technical architecture with multi-tenant strategy
- V2/V3 roadmap

### Stack
- Next.js 15+ (App Router, RSC)
- Hono (API Routes)
- Supabase (PostgreSQL 16 + Storage)
- Drizzle ORM
- Better Auth
- Railway (hosting)
- Resend + React Email
- planby (Gantt planning)
- shadcn/ui + Tailwind CSS
