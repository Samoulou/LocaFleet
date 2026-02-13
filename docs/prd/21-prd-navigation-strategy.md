# 21. Strategie de Navigation PRD pour Claude Code

> Comment Claude Code accede aux documents PRD sans tout charger en memoire. Principe : **progressive disclosure** — charger le minimum necessaire, au bon moment.

---

## 1. Architecture 3 couches

```
┌──────────────────────────────────────────────────────────────┐
│  COUCHE 1 — CLAUDE.md (charge 100% du temps)                │
│  Regles critiques, commandes, rappels transverses            │
│  ~80 lignes = ~2k tokens                                    │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  COUCHE 2 — Orchestrateur (charge quand un skill matche)     │
│  Routing table : tache → quels docs lire                     │
│  ~200 lignes = ~3k tokens                                   │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  COUCHE 3 — Docs PRD (charges a la demande)                  │
│  1-3 docs maximum par tache                                  │
│  ~5-15k tokens par doc                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Carte des docs PRD

```
Docs pour Claude (charges selectivement par l'orchestrateur) :
  3  UI/UX Design Goals        → quand tache UI
  23 ⭐ MVP Workflow           → quand US-MVP-* (DOC PRINCIPAL)
  15 Testing Strategy          → quand phase tests
  18 Securite                  → quand CRUD, upload, review
  19 Performance               → quand listes, upload, dashboard
  20 Ops                       → quand dashboard metrics, export

Schema.ts → toujours quand tache DB
CLAUDE.md → toujours (automatique)

Docs pour toi (reference, jamais charges par Claude) :
  1  Goals & Background
  2  Requirements
  4  Technical Assumptions
  5  Epic List & Avancement
  12 Checklist
  13 Next Steps
  14 Claude Code Setup Guide
  16 Workflow Dev
  17 Orchestration Avancee
  21 Navigation Strategy (ce doc)
  22 Development Flow
```

---

## 3. Matrice Doc × Quand le charger

| Doc | Charge automatiquement | Charge par l'orchestrateur | Quand |
|-----|----------------------|--------------------------|-------|
| CLAUDE.md | ✅ Toujours | — | Chaque session |
| 3 - UI/UX specs | ❌ | ✅ Si tache UI | Pages, composants, formulaires |
| 23 - MVP Workflow | ❌ | ✅ Si US-MVP-* | Toute US du flux location |
| schema.ts | ❌ | ✅ Si tache DB | Tout CRUD, toute migration |
| 15 - Tests | ❌ | ✅ Si ecriture tests | Phase tests de chaque US |
| 18 - Securite | ❌ | ✅ Sections ciblees | Tout CRUD, tout upload, toute review |
| 19 - Performance | ❌ | ✅ Sections ciblees | Listes, upload, dashboard |
| 20 - Ops | ❌ | ❌ (rappels dans CLAUDE.md) | Dashboard metrics, export |
| 4 - Technical | ❌ | ❌ | Rarement (reference architecture) |
| 14-17, 21-22 | ❌ | ❌ | Jamais (docs pour le dev humain) |

**Docs que Claude ne charge JAMAIS** : 1, 2, 4, 5, 12, 13, 14, 16, 17, 21, 22, changelog.
