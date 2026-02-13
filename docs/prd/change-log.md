# Change Log

## [2.1.0] — 2026-02-13

### Changed
- **Audit PRD complet** : mise a jour de tous les documents pour refleter l'etat reel du codebase
- Statuts MVP mis a jour : 9/11 US completees (MVP-7, MVP-8, MVP-9, MVP-10, MVP-11 marques DONE)
- Sprint 4 et Sprint 5 marques COMPLETE dans doc 23
- Nombre de tables corrige : 21 → **23 tables** (ajout `inspectionDamages`, `notifications`, `auditLogs`)
- Nombre d'enums documente : **23 enums**
- Doc 5 (epic list) : barre de progression mise a jour (~90%), MVP-10 ajoute au tableau
- Doc 13 (next steps) : travail restant reduit de ~24h a ~8h (MVP-4 + MVP-5 uniquement)
- Doc 12 (checklist) : story count mis a jour (11 US, 9/11 done)
- Doc 15 (testing) : arborescence corrigee (`src/__tests__/` pas co-located), mention des 51 fichiers de tests
- Doc 14 (claude code setup) : tables/enums corriges, organisation des tests corrigee
- Doc 4 (technical assumptions) : diagramme entites complete avec InspectionDamage, Notification, AuditLog
- Doc 22 (dev flow summary) : avancement mis a jour (9/11 US)

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
