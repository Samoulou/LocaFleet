# 21. Stratégie de Navigation PRD pour Claude Code

> Comment Claude Code accède aux 20 documents sans tout charger en mémoire. Le principe : **progressive disclosure** — charger le minimum nécessaire, au bon moment.

---

## 1. Le problème

| Approche | Résultat |
|----------|---------|
| Charger les 20 docs d'un coup | Context window saturé, Claude ignore les instructions noyées dans le bruit |
| Ne rien charger | Claude code "à l'aveugle", oublie tenantId, formatting CHF, rate limiting |
| Charger 1-2 docs manuellement | Fonctionne mais dépend de toi pour choisir les bons docs à chaque fois |

**La solution : 3 couches de context engineering.**

```
┌──────────────────────────────────────────────────────────────┐
│  COUCHE 1 — CLAUDE.md (chargé 100% du temps)                │
│  Règles critiques, commandes, rappels transverses            │
│  ~80 lignes = ~2k tokens                                    │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  COUCHE 2 — Orchestrateur (chargé quand un skill matche)     │
│  Routing table : tâche → quels docs lire                     │
│  ~200 lignes = ~3k tokens                                   │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  COUCHE 3 — Docs PRD (chargés à la demande)                  │
│  1-3 docs maximum par tâche                                  │
│  ~5-15k tokens par doc                                      │
└──────────────────────────────────────────────────────────────┘
```

**Budget context par session :**
- CLAUDE.md : ~2k tokens (permanent)
- Skills descriptions : ~1k tokens (permanent, 100 tokens × 10 skills)
- Orchestrateur activé : ~3k tokens (chargé quand pertinent)
- 2-3 docs PRD : ~15-30k tokens (chargés par le slash command)
- **Total : ~20-35k tokens sur 200k disponibles = 85% libre pour le travail**

---

## 2. Couche 1 — CLAUDE.md (le cerveau permanent)

Le CLAUDE.md ne contient **pas** les détails. Il contient les **rappels transverses** que Claude doit avoir en tête à chaque instant, et une **carte** des docs pour savoir où chercher.

### CLAUDE.md racine (version mise à jour)

```markdown
# LocaFleet — Back-office de gestion de parc auto locatif

## Stack
Next.js 15, Drizzle ORM, Supabase (PostgreSQL + Storage), Railway, Hono, Better Auth, planby, Vitest, Playwright

## Commands
- `npm run dev` — dev server
- `npm run check` — tsc + lint + vitest (LANCER AVANT CHAQUE COMMIT)
- `npm run e2e` — Playwright E2E
- `npx drizzle-kit generate` — générer migration (JAMAIS push en prod)
- `npx drizzle-kit migrate` — appliquer migration

## Règles critiques (TOUJOURS respecter)
- tenantId : CHAQUE requête DB filtre par tenantId. Pas d'exception.
- Auth check : CHAQUE Server Action qui mute vérifie le rôle (admin/agent).
- Zod : CHAQUE input utilisateur passe par un schema Zod AVANT la DB.
- Soft delete : JAMAIS de .delete(). Toujours .update({ deletedAt: new Date() }).
- Format suisse : CHF avec apostrophe (1'250.00 CHF), dates DD.MM.YYYY.
- Nav : sidebar only, pas de top nav.
- Planning : planby, PAS react-big-calendar.
- Stripe : PAS en V1.

## Sécurité (rappels — détails dans docs/prd/18-security-compliance.md)
- Rate limiting sur login (5/15min) et mutations (30/min)
- RLS Supabase activé sur toutes les tables avec tenant_id
- Input sanitization sur les champs texte libre (isomorphic-dompurify)
- Signed URLs pour les fichiers Supabase Storage (jamais d'URL publiques)
- Audit trail : appeler audit() après chaque create/update/delete

## Performance (rappels — détails dans docs/prd/19-performance-scalability.md)
- unstable_cache + revalidateTag pour les queries fréquentes
- Pagination standardisée avec PaginatedResult<T>
- Compression images côté client avant upload (browser-image-compression → WebP)
- Error Boundaries sur chaque section du dashboard

## Ops (rappels — détails dans docs/prd/20-ops-observability.md)
- Logger pino (pas console.log) avec createActionLogger()
- Chaque Server Action log info en succès, warn en validation fail, error en erreur

## Carte des docs PRD (pour savoir où chercher)
- ⭐ MVP Workflow : docs/prd/23-mvp-workflow.md (DOC PRINCIPAL Sprint 3-4)
- Epic 1 (Foundation) : docs/prd/6-epic-1-foundation-auth.md
- Epic 2 (Véhicules) : docs/prd/7-epic-2-fleet-management.md
- Epics 3-6 (Clients/Contrats/Inspections/Billing/Notif) : SUPERSEDED → utiliser doc 23
- Schema DB : docs/prd/schema.ts (ou src/db/schema.ts)
- Sécurité : docs/prd/18-security-compliance.md
- Performance : docs/prd/19-performance-scalability.md
- Ops : docs/prd/20-ops-observability.md
- UI/UX specs : docs/prd/3-user-interface-design-goals.md
- Tests : docs/prd/15-testing-strategy.md
```

**~60 lignes. Les détails sont dans les docs. Le CLAUDE.md dit juste "la règle existe" et "voilà où la trouver".**

---

## 3. Couche 2 — Orchestrateur (le routeur intelligent)

Le skill orchestrateur est la pièce maîtresse. Quand Claude reçoit une tâche, il lit l'orchestrateur et sait **quels docs charger**.

### `.claude/skills/locafleet-orchestrator/SKILL.md` (version mise à jour)

```markdown
---
name: locafleet-orchestrator
description: Routes any LocaFleet development task to the correct PRD documents, skills, and patterns. Use for any implementation, planning, testing, or review task.
---

# LocaFleet Orchestrator — Routing Table

## How to use this skill
When you receive a task, match it against the patterns below. Load ONLY the listed docs — never load all docs at once.

## Routing Rules

### MVP Workflow (Sprint 3-4) — PRIORITAIRE
READ FIRST:
1. docs/prd/23-mvp-workflow.md (LE doc principal pour toute US-MVP-*)
2. src/db/schema.ts (tables contracts, clients, inspections, invoices)
3. docs/prd/18-security-compliance.md → Section 2.4 + Section 5
APPLY:
- Suivre le flux linéaire : véhicule → contrat → facture → CG → digicode → inspection → archivage
- Respecter les statuts du contrat (draft → approved → pending_cg → active → completed)
- Un seul contrat actif par véhicule à la fois

### CRUD / Server Actions (any entity)
READ FIRST:
1. The Epic doc for this entity (e.g. docs/prd/8-epic-3-clients-contracts.md for clients)
2. src/db/schema.ts (find the relevant table)
3. docs/prd/18-security-compliance.md → Section 2.4 (sanitization) + Section 5 (audit trail)
4. docs/prd/19-performance-scalability.md → Section 2 (pagination pattern)
APPLY:
- tenantId on every query
- Zod validation on every mutation
- audit() after every create/update/delete
- createActionLogger() for structured logging
- PaginatedResult<T> for list queries

### UI Pages / Components
READ FIRST:
1. The Epic doc for this feature
2. docs/prd/3-user-interface-design-goals.md (patterns A/B/C/D)
3. docs/prd/19-performance-scalability.md → Section 5 (Error Boundaries)
APPLY:
- Server Components by default, 'use client' only for interactivity
- Error boundary (error.tsx) for each route segment
- Toast feedback (sonner) on every mutation
- i18n keys in translation files, never hardcoded strings

### File Upload (photos, documents)
READ FIRST:
1. docs/prd/18-security-compliance.md → Section 2.5 (signed URLs)
2. docs/prd/19-performance-scalability.md → Section 3 (storage + compression)
APPLY:
- Compress before upload (browser-image-compression)
- WebP format + thumbnail
- Signed URLs only (never public)
- File type + size validation

### Database Changes (schema, migrations)
READ FIRST:
1. docs/prd/schema.ts (current schema)
2. docs/prd/18-security-compliance.md → Section 3 (RLS + migrations)
APPLY:
- drizzle-kit generate (never push in prod)
- Backward-compatible migrations
- Add RLS policy for new tables with tenant_id
- Add indexes for columns used in WHERE/ORDER BY

### Testing
READ FIRST:
1. docs/prd/15-testing-strategy.md
2. The Epic doc (for acceptance criteria in Gherkin)
APPLY:
- Unit test every Server Action (happy path, auth rejection, Zod rejection)
- Unit test every Zod schema (valid, invalid, edge cases)
- E2E at end of Epic only

### Planning / Billing / Dashboard
READ FIRST:
1. docs/prd/10-epic-5-billing-dashboard.md
2. docs/prd/19-performance-scalability.md → Section 4 (query optimization)
3. docs/prd/20-ops-observability.md → Section 3 (business metrics)
APPLY:
- Aggregated SQL queries (never load all records then filter in JS)
- unstable_cache + revalidateTag
- Promise.all for parallel independent queries

### Email / Notifications
READ FIRST:
1. docs/prd/11-epic-6-notifications-email.md
2. docs/prd/20-ops-observability.md → Section 1 (logging)
APPLY:
- Resend API via Hono route
- Log every email sent (email_logs table)
- Rate limit on email sending (20/min per tenant)

### Code Review (/review command)
READ (scan, don't read fully):
1. docs/prd/18-security-compliance.md → Section 7 (checklist)
2. docs/prd/19-performance-scalability.md → Section 8 (checklist)
3. docs/prd/20-ops-observability.md → Section 9 (checklist)
CHECK:
- tenantId on every query? 
- Zod on every mutation?
- audit() on every create/update/delete?
- logger (not console.log)?
- Error boundary present?
- Swiss formatting (CHF, dates)?
- Tests written?

## Anti-patterns
- ❌ NEVER load all 20 PRD docs at once
- ❌ NEVER code without reading the relevant Epic doc first
- ❌ NEVER skip the security doc when writing Server Actions
- ❌ NEVER skip the performance doc when writing list pages
```

---

## 4. Couche 3 — Slash commands (le déclencheur)

Les slash commands **forcent** la lecture des bons docs. C'est la garantie que l'orchestrateur n'est pas ignoré.

### `/implement-us` (mis à jour)

```markdown
# .claude/commands/implement-us.md

Read the orchestrator skill first. Then:

1. Find US $ARGUMENTS in the docs/prd/ directory. Read the full Epic doc.
2. Read src/db/schema.ts — find the relevant tables.
3. Follow the orchestrator routing table to load the additional docs needed for this type of task.
4. Read docs/prd/3-user-interface-design-goals.md if the US involves UI.

IMPORTANT: Do NOT load docs that are not relevant. Maximum 3-4 docs per task.

5. Enter Plan Mode. Propose your implementation plan with:
   - Files to create/modify (with full paths)
   - Approach and patterns used
   - Security considerations (from doc 18)
   - Performance considerations (from doc 19)
   - Tests to write

6. WAIT for my approval before writing any code.

7. After approval, implement file by file.

8. After implementation:
   - Write unit tests for all Server Actions and Zod schemas
   - Run `npx vitest run` on your tests
   - Call audit() in every create/update/delete action
   - Use createActionLogger() in every action
   - Run `npm run check` (tsc + lint + tests)
   - Review your own code against the orchestrator checklists
```

### `/review` (mis à jour)

```markdown
# .claude/commands/review.md

Run `git diff --stat` to see changed files.
Then run `git diff` to see the full changes.

Read the checklists from:
- docs/prd/18-security-compliance.md → Section 7
- docs/prd/19-performance-scalability.md → Section 8
- docs/prd/20-ops-observability.md → Section 9

Use the security-reviewer subagent for security analysis.
Use the db-analyst subagent for query performance analysis.

For each changed file, verify:
1. Security: tenantId, auth check, Zod validation, input sanitization, signed URLs
2. Performance: no N+1, pagination on lists, cache on frequent queries, Error Boundaries
3. Ops: pino logger (not console.log), audit() calls, proper error handling
4. Code quality: no `any`, Swiss formatting, i18n keys, tests exist
5. Conventions: file structure, naming, soft delete

Report findings with file:line references and severity (CRITICAL/HIGH/MEDIUM/LOW).
If there are CRITICAL issues, fix them. For MEDIUM/LOW, list them and ask if I want them fixed.
```

---

## 5. Exemple concret — Ce que Claude charge pour US-3.1 (CRUD Clients)

```
Étape 1 : CLAUDE.md chargé automatiquement (~2k tokens)
  → Claude sait : tenantId obligatoire, format CHF, audit(), logger pino

Étape 2 : /implement-us US-3.1 → orchestrateur activé (~3k tokens)
  → Routing : CRUD → Epic doc + schema + security + performance

Étape 3 : Claude charge les docs ciblés :
  ✅ docs/prd/8-epic-3-clients-contracts.md (~8k tokens) — les US, les acceptance criteria
  ✅ src/db/schema.ts — table clients, colonnes, relations (~3k tokens pour la partie pertinente)
  ✅ docs/prd/18-security-compliance.md §2.4 + §5 (~3k tokens) — sanitization + audit trail
  ✅ docs/prd/19-performance-scalability.md §2 (~2k tokens) — pagination pattern

  ❌ docs/prd/7-epic-2-fleet-management.md — pas pertinent
  ❌ docs/prd/11-epic-6-notifications-email.md — pas pertinent
  ❌ docs/prd/20-ops-observability.md — pas besoin complet, les rappels sont dans CLAUDE.md
  ❌ docs/prd/17-claude-code-advanced-orchestration.md — c'est pour toi, pas pour Claude

Total chargé : ~21k tokens sur 200k = 10% du context
Résultat : Claude a TOUT ce qu'il faut pour cette US, et 90% du context libre pour coder.
```

---

## 6. Matrice complète : Doc × Quand le charger

| Doc | Chargé automatiquement | Chargé par l'orchestrateur | Quand |
|-----|----------------------|--------------------------|-------|
| CLAUDE.md | ✅ Toujours | — | Chaque session |
| 3 - UI/UX specs | ❌ | ✅ Si tâche UI | Pages, composants, formulaires |
| 4 - Technical assumptions | ❌ | ❌ | Rarement (référence architecture) |
| 6 - Epic 1 | ❌ | ✅ Si US Epic 1 | US-1.x |
| 7 - Epic 2 | ❌ | ✅ Si US Epic 2 | US-2.x |
| 8 - Epic 3 | ❌ | ✅ Si US Epic 3 | US-3.x |
| 9 - Epic 4 | ❌ | ✅ Si US Epic 4 | US-4.x |
| 10 - Epic 5 | ❌ | ✅ Si US Epic 5 | US-5.x |
| 11 - Epic 6 | ❌ | ✅ Si US Epic 6 | US-6.x |
| schema.ts | ❌ | ✅ Si tâche DB | Tout CRUD, toute migration |
| 15 - Tests | ❌ | ✅ Si écriture tests | Phase tests de chaque US |
| 18 - Sécurité | ❌ | ✅ Sections ciblées | Tout CRUD, tout upload, toute review |
| 19 - Performance | ❌ | ✅ Sections ciblées | Listes, upload, dashboard, review |
| 20 - Ops | ❌ | ❌ (rappels dans CLAUDE.md) | Dashboard metrics, export Excel |
| 14 - Claude Code setup | ❌ | ❌ | Jamais (doc pour toi, pas pour Claude) |
| 16 - Workflow | ❌ | ❌ | Jamais (doc pour toi, pas pour Claude) |
| 17 - Orchestration avancée | ❌ | ❌ | Jamais (doc pour toi, pas pour Claude) |

**Docs que Claude ne charge JAMAIS** : 1, 2, 4, 5, 12, 13, 14, 16, 17, changelog. Ce sont des docs pour toi (product owner / architecte), pas pour l'agent qui code.

---

## 7. Mise à jour du Sprint 0

### Ce qui change dans US-0.8 (Claude Code setup)

Ajouter à la checklist :
- [ ] CLAUDE.md racine mis à jour avec la carte des docs et les rappels transverses (section 2 ci-dessus)
- [ ] Orchestrateur mis à jour avec la routing table complète (section 3 ci-dessus)
- [ ] `/implement-us` command mis à jour avec les instructions de chargement sélectif (section 4)
- [ ] `/review` command mis à jour avec les 3 checklists (section 4)
- [ ] Vérifier que les docs 14, 16, 17 ne sont PAS référencés dans les skills (ils sont pour le dev humain, pas pour Claude)

### Test de validation

Après le setup, lancer ce test dans Claude Code :

```
/implement-us US-3.1
```

Vérifier que Claude :
1. ✅ Charge l'orchestrateur
2. ✅ Lit docs/prd/8-epic-3-clients-contracts.md
3. ✅ Lit src/db/schema.ts
4. ✅ Mentionne le rate limiting ou l'audit trail dans son plan
5. ✅ Mentionne la pagination dans son plan
6. ❌ Ne charge PAS les docs des autres Epics
7. ❌ Ne charge PAS les docs 14, 16, 17
