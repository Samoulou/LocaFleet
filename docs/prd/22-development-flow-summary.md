# LocaFleet — Flow de développement

> Le seul document à garder ouvert pendant le dev. Tout le reste est dans les 21 docs PRD que Claude Code charge automatiquement.

---

## Phase 0 — Setup (~5h, une seule fois)

```
1. Créer le repo GitHub (US-0.1)
2. Créer les comptes Supabase + Railway + Resend (US-0.2)
3. npx create-next-app + shadcn + toutes les dépendances (US-0.3)
4. Copier schema.ts → drizzle-kit push (dev uniquement) + seed 3 users (US-0.4, US-0.5)
5. Configurer Better Auth email/password (US-0.5)
6. ESLint + Prettier (US-0.6)
7. Configurer Vitest + Playwright (US-0.7)
8. Mettre en place Claude Code :
   - CLAUDE.md racine (avec carte des docs + rappels transverses)
   - Orchestrateur (routing table)
   - 3 subagents (security-reviewer, test-writer, db-analyst)
   - 4 slash commands (/implement-us, /review, /plan, /test-us)
   - Hook block-at-commit + Prettier post-write
   - Script pre-commit-check.sh (US-0.8)
9. Copier les 21 docs PRD dans docs/prd/ (US-0.9)
```

**Validation :** lancer `/implement-us US-3.1` et vérifier que Claude charge les bons docs (Epic 3 + schema + sécurité + perf), propose un plan avec tenantId + pagination + audit, et ne charge PAS les 17 autres docs.

---

## Phase 1-6 — Développement (Epic par Epic)

### Boucle par Sprint

```
Pour chaque Sprint (= 1 Epic ou sous-ensemble d'Epic) :

  1. PLANIFIER
     └─ /sprint docs/prd/{epic}.md
        Claude lit l'Epic, crée la liste de tâches ordonnée avec dépendances
        Tu approuves ou réordonnes

  2. POUR CHAQUE US :

     ┌─────────────────────────────────────────────────────┐
     │  git checkout -b feature/US-{n.m}-{description}     │
     │                                                     │
     │  /implement-us US-{n.m}                             │
     │    → Claude charge orchestrateur                    │
     │    → Charge 2-3 docs ciblés (Epic + schema + sec)  │
     │    → Propose un plan                                │
     │    → TU APPROUVES                                   │
     │    → Claude code fichier par fichier                │
     │    → Claude écrit les tests                         │
     │    → Claude lance npm run check                     │
     │                                                     │
     │  /review                                            │
     │    → Subagent security-reviewer vérifie             │
     │    → Subagent db-analyst vérifie                    │
     │    → Claude checke les 3 checklists (sec/perf/ops)  │
     │    → Corrige les CRITICAL, liste les MEDIUM/LOW     │
     │                                                     │
     │  Test manuel rapide dans le browser                 │
     │                                                     │
     │  git add . && git commit                            │
     │    → Hook pre-commit : npm run check passe ?        │
     │      ✅ → commit autorisé                           │
     │      ❌ → commit bloqué, corriger d'abord           │
     │                                                     │
     │  git push → PR → merge                              │
     └─────────────────────────────────────────────────────┘

  3. FIN D'EPIC
     └─ Lancer les tests E2E Playwright (parcours complet)
     └─ /compact (garder le contexte, libérer le context window)

  4. AMÉLIORATION CONTINUE
     └─ Chaque erreur de Claude → ajouter une règle dans CLAUDE.md → commit
        (Flywheel compound engineering)
```

### Ordre des Sprints

```
Sprint 0  Setup & Pré-requis .............. ~5h     ✅ DONE
Sprint 1  Epic 1 — Foundation & Auth ...... ~3-4j   ✅ DONE
          + US-SEC-1/2/3, US-OPS-1/2, US-PERF-3
Sprint 2  Epic 2 — Fleet Management ....... ~3-4j   ✅ DONE
          + US-PERF-2 (image upload)
Sprint 3  MVP — Contrat & Facturation ..... ~4-5j   ← NEXT
          US-MVP-1 à MVP-5 (doc 23)
          Migration schema (isTrusted, CG, digicode)
Sprint 4  MVP — Inspections & Archivage ... ~3-4j
          US-MVP-6 à MVP-8 (doc 23)
Sprint 5  Polish & Post-MVP ............... ~5-7j
          US-MVP-9 (CRUD clients)
          Planning planby
          Dashboard KPIs
          Export Excel

Total estimé restant : 12-16 jours de dev
```

---

## Ce que tu fais vs ce que Claude fait

| Toi (Product Owner / Architecte) | Claude Code (Développeur) |
|----------------------------------|--------------------------|
| Décider l'ordre des US | Charger les bons docs (via orchestrateur) |
| Approuver/ajuster le plan | Proposer le plan d'implémentation |
| Approuver le code | Écrire le code fichier par fichier |
| Test manuel dans le browser | Écrire et lancer les tests auto |
| Décider quand merger | Review avec subagents + checklists |
| Ajouter des règles au CLAUDE.md quand Claude se trompe | Suivre les règles du CLAUDE.md |
| Gérer les deploys Railway | Générer les migrations DB |

**Ta boucle quotidienne :**
```
Matin : /implement-us → approuver → laisser Claude bosser
         /review → vérifier → test manuel → commit → push
Soir :   2-3 US mergées, compound engineering si erreurs détectées
```

---

## Rappel des 21 docs PRD

```
Docs pour toi (référence, jamais chargés par Claude) :
  1  Goals & Background
  2  Requirements
  4  Technical Assumptions
  5  Epic List
  12 Checklist
  13 Next Steps
  14 Claude Code Setup Guide
  16 Workflow Dev
  17 Orchestration Avancée
  21 Navigation Strategy
  
Docs pour Claude (chargés sélectivement par l'orchestrateur) :
  3  UI/UX Design Goals        → quand tâche UI
  6  Epic 1 Foundation         → quand US-1.x
  7  Epic 2 Fleet              → quand US-2.x
  23 ⭐ MVP Workflow           → quand US-MVP-* (REMPLACE docs 8-11 pour le MVP)
  8-11 Anciens Epics 3-6       → référence post-MVP uniquement
  15 Testing Strategy          → quand phase tests
  18 Sécurité                  → quand CRUD, upload, review
  19 Performance               → quand listes, upload, dashboard
  20 Ops                       → quand dashboard metrics, export

Schema.ts → toujours quand tâche DB
CLAUDE.md → toujours (automatique)
```

---

## Go.
