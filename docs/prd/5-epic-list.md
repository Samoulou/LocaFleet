# 5. Phases & Avancement MVP

## Vue d'ensemble

LocaFleet MVP couvre le **flux complet de location** : de la creation du contrat jusqu'a l'archivage apres retour du vehicule. Les anciennes 6 epics ont ete consolidees en un workflow MVP unique (voir [23-mvp-workflow.md](./23-mvp-workflow.md)).

```
Phase 1 (Foundation)     ████████████████████  DONE
Phase 2 (Fleet)          ████████████████████  DONE
Phase 3 (MVP Contrats)   ████████████░░░░░░░░  EN COURS
Phase 4 (Post-MVP)       ░░░░░░░░░░░░░░░░░░░░  BACKLOG
```

---

## Avancement detaille

### Phase 1 — Foundation & Auth ✅ COMPLETE

- Multi-tenant auth (Better Auth)
- RBAC (admin / agent / viewer)
- i18n FR/EN
- Sidebar navigation
- User management
- Audit logs

### Phase 2 — Fleet Management ✅ COMPLETE

- CRUD vehicules (liste, detail, creation, edition)
- Categories vehicules + tarifs journaliers
- Photos vehicules (galerie, cover)
- Gestion des statuts (available / rented / maintenance / out_of_service)
- Maintenance records (creation, cloture)
- Settings categories

### Phase 3 — MVP Flux Location 🔄 EN COURS

> Detail complet : [23-mvp-workflow.md](./23-mvp-workflow.md)

| US | Description | Statut |
|----|-------------|--------|
| MVP-1 | Formulaire creation contrat depuis vehicule | ✅ Done |
| MVP-2 | Autocomplete client + modal creation rapide | ✅ Done |
| MVP-3 | Approbation contrat + facture auto-generee | ✅ Done |
| MVP-4 | Email CG + page approbation publique (client trusted) | ❌ A faire |
| MVP-5 | Generation digicode + notification | ❌ A faire |
| MVP-6 | Constat de depart (etat des lieux sortie) | ✅ Done |
| MVP-7 | Constat de retour (etat des lieux retour) | ❌ A faire |
| MVP-8 | Validation retour + archivage automatique | ❌ A faire |
| MVP-9 | Page CRUD clients autonome | ❌ A faire |

**Bonus deja implemente :**
- Liste des contrats avec filtres par statut
- Page detail contrat
- Liste des factures avec filtres
- Enregistrement des paiements

### Phase 4 — Post-MVP (BACKLOG)

Features repoussees apres le MVP :

| Feature | Origine | Priorite |
|---------|---------|----------|
| Planning Gantt (planby) | ex-Epic 4 | Should |
| Dashboard KPIs | ex-Epic 5 | Should |
| Notifications avancees (alertes maintenance, rappels) | ex-Epic 6 | Could |
| Export PDF contrat | ex-Epic 3 | Should |
| Filtres avances clients | ex-Epic 3 | Could |
| Page maintenance dediee | ex-Epic 2 | Could |

---

## Definition of Done (Global)

Chaque User Story est consideree "Done" quand :

- [ ] Le code est merge via Pull Request
- [ ] Les tests unitaires passent (vitest)
- [ ] Les criteres d'acceptation sont verifies
- [ ] L'interface est responsive (desktop + tablet minimum)
- [ ] Le `tenant_id` est correctement filtre dans toutes les requetes
- [ ] `npm run check` passe (tsc + lint + tests)
