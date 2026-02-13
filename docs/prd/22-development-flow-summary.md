# LocaFleet — Flow de developpement

> Le seul document a garder ouvert pendant le dev.

---

## Avancement

```
Phase 1  Foundation & Auth .............. ✅ DONE
Phase 2  Fleet Management ............... ✅ DONE
Phase 3  MVP Flux Location .............. 🔄 9/11 US done (reste MVP-4 + MVP-5)
Phase 4  Post-MVP ....................... ░░ BACKLOG
```

### Detail Phase 3 — MVP

| US | Description | Statut |
|----|-------------|--------|
| MVP-1 | Form contrat depuis vehicule | ✅ Done |
| MVP-2 | Autocomplete client + modal | ✅ Done |
| MVP-3 | Approbation + facture auto | ✅ Done |
| MVP-4 | Email CG + page publique | ❌ A faire |
| MVP-5 | Digicode + notification | ❌ A faire |
| MVP-6 | Constat de depart | ✅ Done |
| MVP-7 | Constat de retour (+ photos tablette) | ✅ Done |
| MVP-8 | Validation retour + archivage | ✅ Done |
| MVP-9 | Page CRUD clients (detail, documents, KPIs) | ✅ Done |
| MVP-10 | Capture photo tablette + compression WebP | ✅ Done |
| MVP-11 | Page detail facture | ✅ Done |

**Bonus deja implemente :** liste contrats, detail contrat, liste factures, paiements.

---

## Boucle par US

```
Pour chaque US :

  1. PLANIFIER
     └─ /implement-us US-MVP-X
        Claude lit le MVPWorkflow (doc 23), propose un plan
        Tu approuves ou corriges

  2. IMPLEMENTER
     ┌─────────────────────────────────────────────────────┐
     │  git checkout -b feat/US-MVP-X-description          │
     │                                                     │
     │  Claude code fichier par fichier                    │
     │  Claude ecrit les tests                             │
     │  Claude lance npm run check                         │
     │                                                     │
     │  /review                                            │
     │    → Verification securite, tenantId, tests         │
     │    → Corrections                                    │
     │                                                     │
     │  Test manuel dans le navigateur                     │
     │                                                     │
     │  git add && git commit                              │
     │  git push                                           │
     └─────────────────────────────────────────────────────┘

  3. FIN DE PHASE
     └─ Tests E2E Playwright
```

---

## Ce que tu fais vs ce que Claude fait

| Toi (Product Owner) | Claude Code (Developpeur) |
|---------------------|--------------------------|
| Decider l'ordre des US | Charger les bons docs (via orchestrateur) |
| Approuver le plan | Proposer le plan d'implementation |
| Approuver le code | Ecrire le code fichier par fichier |
| Test manuel navigateur | Ecrire et lancer les tests auto |
| Decider quand merger | Review avec checklists |

---

## Rappel des docs PRD

```
Doc principal MVP :
  23 ⭐ MVP Workflow (source de verite pour toutes les US)

Docs charges par Claude quand pertinent :
  3  UI/UX Design Goals
  15 Testing Strategy
  18 Securite
  19 Performance
  20 Ops
  schema.ts (toujours pour les taches DB)
```

---

## Go.
