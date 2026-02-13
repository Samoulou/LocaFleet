# Change Log

## [2.0.0] — 2026-02-13

### Changed
- **Scope MVP redefini** : flux location complet (contrat → inspection → archivage) comme seul objectif
- Epic files (6 a 11) supprimes — remplace par 23-mvp-workflow.md comme source de verite unique
- Sprint 0 (6b) supprime — termine
- Requirements (doc 2) : Planning, Dashboard, Notifications avancees → post-MVP
- UI specs (doc 3) : camera native tablette pour inspections, Planning/Dashboard tagges post-MVP
- Index (index.md) reorganise en 4 sections claires
- Epic list (doc 5) reecrit avec avancement MVP detaille

### Added
- Photo capture tablette : spec `capture="environment"` pour camera native dans inspections
- Stockage photos Supabase Storage avec compression WebP
- Tags MVP/Post-MVP sur tous les requirements

### Removed
- `6-epic-1-foundation-auth.md` (complete, supprime)
- `6b-sprint-0-setup.md` (complete, supprime)
- `7-epic-2-fleet-management.md` (complete, supprime)
- `8-epic-3-clients-contracts.md` (remplace par doc 23)
- `9-epic-4-inspections-planning.md` (remplace par doc 23)
- `10-epic-5-billing-dashboard.md` (remplace par doc 23)
- `11-epic-6-notifications-email.md` (remplace par doc 23)

## [1.2.0] — 2026-02-08

### Changed
- Navigation: sidebar-only (suppression de toute navigation horizontale)
- Inspection: split en MVP (V1.0) et Version Finale (V1.1)
- Planning: react-big-calendar → **planby** (Gantt timeline)
- UI Design Goals: refonte complete avec specifications dev detaillees

### Removed
- Stripe: aucune integration paiement en V1

## [1.1.0] — 2026-02-08

### Changed
- Stack: Vercel → **Railway**, Neon → **Supabase**, Prisma → **Drizzle ORM**
- Storage: Vercel Blob → **Supabase Storage**
- Backend: ajout **Hono** pour API Routes lourdes
- Payments: Stripe Connect → supprime en V1 (facturation manuelle)
- Auth: NextAuth.js → **Better Auth**

## [1.0.0] — 2026-02-06

### Added
- Initial PRD creation
- Goals & background context
- Functional & non-functional requirements
- UI/UX design goals
- Technical architecture with multi-tenant strategy
- V2/V3 roadmap
