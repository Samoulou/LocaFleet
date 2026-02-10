# 5. Epic List

## Delivery Phases Overview

LocaFleet V1 est découpé en **6 epics** livrés séquentiellement. Chaque epic produit un incrément fonctionnel testable.

```
Phase 1 (Foundation)     ████░░░░░░░░░░░░░░░░  Epic 1: Foundation & Auth
Phase 2 (Core Data)      ░░░░████████░░░░░░░░  Epic 2: Fleet Management
Phase 3 (Business Logic) ░░░░░░░░░░░░████████  Epic 3: Clients & Contracts
Phase 4 (Operations)     ░░░░░░░░░░░░░░░░████  Epic 4: Inspections & Planning
Phase 5 (Finance)        ░░░░░░░░░░░░░░░░░░██  Epic 5: Billing & Dashboard
Phase 6 (Communication)  ░░░░░░░░░░░░░░░░░░░█  Epic 6: Notifications & Email
```

## Epic Summary

| # | Epic | Description | Stories (est.) | Priority |
|---|------|-------------|----------------|----------|
| 1 | [Foundation & Auth](./6-epic-1-foundation-auth.md) | Setup projet, auth, rôles, i18n, layout principal | ~8 | Must — Sprint 1-2 |
| 2 | [Fleet Management](./7-epic-2-fleet-management.md) | CRUD véhicules, catégories, statuts, maintenance, photos | ~10 | Must — Sprint 2-4 |
| 3 | [Clients & Contracts](./8-epic-3-clients-contracts.md) | Gestion clients, contrats de location, génération PDF | ~12 | Must — Sprint 4-6 |
| 4 | [Inspections & Planning](./9-epic-4-inspections-planning.md) | États des lieux (MVP), planning Gantt (planby), disponibilité | ~13 | Must — Sprint 6-8 |
| 5 | [Billing & Dashboard](./10-epic-5-billing-dashboard.md) | Facturation, paiements, quittancement, dashboard KPIs | ~10 | Must — Sprint 8-10 |
| 6 | [Notifications & Email](./11-epic-6-notifications-email.md) | Emails transactionnels, alertes maintenance | ~6 | Must — Sprint 10-11 |

**Total estimé : ~56 User Stories**

## Dependencies Between Epics

```
Epic 1 (Foundation)
  │
  ├──▶ Epic 2 (Fleet) ──▶ Epic 4 (Inspections & Planning)
  │                              │
  ├──▶ Epic 3 (Clients & Contracts) ──┤
  │                                    │
  │                                    ▼
  │                            Epic 5 (Billing & Dashboard)
  │                                    │
  └────────────────────────────────────▶ Epic 6 (Notifications)
```

## Definition of Done (Global)

Chaque User Story est considérée "Done" quand :

- [ ] Le code est mergé sur `main` via Pull Request reviewed
- [ ] Les tests unitaires passent (vitest)
- [ ] Les critères d'acceptation (Gherkin) sont vérifiés
- [ ] L'interface est responsive (desktop + tablet minimum)
- [ ] Les traductions FR/EN sont en place
- [ ] Le `tenant_id` est correctement filtré dans toutes les requêtes
- [ ] La fonctionnalité est déployée sur l'environnement de staging Railway
