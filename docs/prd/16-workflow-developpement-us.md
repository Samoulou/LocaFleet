# 16. Workflow Développement d'une User Story

> Guide pas-à-pas du premier prompt au push sur Git. Exemple concret : **US-3.1 — CRUD Clients**.

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 0 — Ouverture Claude Code                               │
│  CLAUDE.md chargé ✅  Skills scannés ✅  Commands dispo ✅      │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 — Branche Git                                         │
│  git checkout -b feat/US-3.1-crud-clients                      │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 — /implement-us US-3.1                                │
│  → Lit le PRD (Epic 3)                                         │
│  → Charge skills (schema, stack, ui, testing)                  │
│  → Lit schema.ts + specs UI                                    │
│  → Propose un PLAN (pas de code)                               │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3 — Review du plan                                      │
│  Toi : tu valides, corriges, ajustes                           │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4 — Implémentation                                      │
│  Claude code fichier par fichier                                │
│  Prettier auto-format après chaque fichier ✅                    │
│  Tu interviens si besoin                                       │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 5 — Tests unitaires                                     │
│  Claude écrit les tests (actions + Zod + utils)                │
│  npx vitest run → tous verts ✅                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 6 — Code review automatique                             │
│  /review → tenantId, sécurité, tests, formatting               │
│  Claude corrige les issues trouvées                            │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 7 — Test manuel                                         │
│  Toi dans le navigateur : tu testes le parcours                │
│  Si bug → "Quand je clique X, il se passe Y au lieu de Z"     │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 8 — Check complet + Commit + Push                       │
│  npm run check (tsc + lint + tests)                            │
│  git commit + push                                             │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 9 — E2E (si fin d'Epic)                                 │
│  Playwright : parcours complet de l'Epic                       │
│  npm run e2e → tous verts ✅                                    │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 10 — /clear → prochaine US                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Étape 0 — Ouverture de Claude Code

Tu ouvres ton terminal dans le dossier LocaFleet et tu lances `claude`.

**Ce qui se passe automatiquement (sans que tu fasses rien) :**

| Élément | Chargé ? | Contenu |
|---------|----------|---------|
| `./CLAUDE.md` | ✅ Toujours | Stack, commandes, conventions, règles critiques |
| Skills (descriptions) | ✅ Scannés | ~100 tokens par skill, Claude lit les `description` des 5 skills custom + les skills installés |
| Skills (contenu complet) | ❌ Pas encore | Chargés à la demande quand Claude les juge pertinents |
| PRD / Schema / Specs UI | ❌ Pas encore | Claude sait qu'ils existent (mentionnés dans CLAUDE.md) mais ne les a pas lus |
| Slash commands | ✅ Disponibles | `/implement-us`, `/test-us`, `/review`, `/plan` prêts à l'emploi |
| Hooks | ✅ Actifs | Prettier auto-format (non-bloquant) + block-at-commit |

---

## Étape 1 — Création de la branche

**Toi :**
```
Crée une branche feat/US-3.1-crud-clients depuis develop
```

**Claude exécute :**
```bash
git checkout develop
git pull origin develop
git checkout -b feat/US-3.1-crud-clients
```

**Pourquoi :** Chaque US a sa propre branche. Si Claude fait une catastrophe, un simple `git checkout develop` et tu perds rien.

---

## Étape 2 — Lancement du slash command

**Toi :**
```
/implement-us US-3.1
```

**Ce qui se passe sous le capot, dans l'ordre :**

**2a.** Claude Code remplace `$ARGUMENTS` par `US-3.1` et injecte le contenu de `.claude/commands/implement-us.md` :

> *"Read the user story US-3.1 from docs/prd/. First, enter Plan Mode and propose an implementation plan. Reference the relevant skills. Wait for my approval before coding. After implementation: write unit tests, run vitest, run tsc, review your own code."*

**2b.** Claude doit trouver l'US-3.1. Il ouvre et lit `docs/prd/23-mvp-workflow.md`. Il trouve :
- La description de l'US
- Les acceptance criteria en Gherkin
- Les notes techniques

**2c.** Les skills se déclenchent. Le prompt mentionne "implementation" + "user story", ce qui matche la `description` de l'orchestrateur. Claude charge `locafleet-orchestrator` et lit la routing table :

> *CRUD client → `locafleet-schema` + `locafleet-stack` + `locafleet-ui` + `locafleet-testing`*

**2d.** Claude charge les 4 skills et lit leur contenu complet :
- `locafleet-schema` → il ouvre `src/db/schema.ts`, voit la table `clients` (colonnes, types, relations)
- `locafleet-stack` → il connaît les conventions (Server Actions dans `src/actions/`, Zod dans `src/lib/validations/`, structure de dossiers)
- `locafleet-ui` → il lit les patterns UI (Pattern A pour la liste, Pattern B pour le détail)
- `locafleet-testing` → il sait qu'il devra écrire des tests pour chaque action et chaque schema Zod

**2e.** Le template dit "enter Plan Mode, wait for approval" → Claude NE CODE PAS. Il propose un plan.

---

## Étape 3 — Claude propose un plan, tu reviews

**Claude affiche :**

> **Plan d'implémentation US-3.1 — CRUD Clients**
>
> **Fichiers à créer :**
>
> *Validation :*
> 1. `src/lib/validations/client.ts` — Schéma Zod (firstName, lastName, phone, email, licenseNumber)
>
> *Server Actions :*
> 2. `src/actions/client.actions.ts` — createClient, updateClient, softDeleteClient, getClients, getClientById
>
> *Pages :*
> 3. `src/app/[locale]/(dashboard)/clients/page.tsx` — Liste (Pattern A, DataTable, filtres, pagination)
> 4. `src/app/[locale]/(dashboard)/clients/[id]/page.tsx` — Détail (Pattern B, info cards, tabs documents)
> 5. `src/app/[locale]/(dashboard)/clients/new/page.tsx` — Formulaire création
> 6. `src/app/[locale]/(dashboard)/clients/[id]/edit/page.tsx` — Formulaire édition
>
> *Composants :*
> 7. `src/components/forms/client-form.tsx` — Formulaire réutilisable (création + édition)
>
> *Tests unitaires :*
> 8. `src/lib/validations/client.test.ts` — Tests du schema Zod (valid, invalid, edge cases)
> 9. `src/actions/client.actions.test.ts` — Tests des 5 actions (happy path, auth, validation)
>
> *i18n :*
> 10. Ajout des clés FR/EN dans `src/i18n/messages/fr.json` et `en.json`
>
> **Approach :**
> - Server Components pour les pages, 'use client' uniquement pour le formulaire
> - Soft delete (deletedAt) au lieu de suppression physique
> - Dialog de confirmation avant suppression
> - Toast sonner pour feedback (succès/erreur)
> - tenantId filtré sur toutes les requêtes
>
> **Dois-je procéder ?**

**Toi, tu reviews :**

C'est **LE** moment le plus important du workflow. Tu vérifies :
- ✅ Tous les fichiers nécessaires sont listés ?
- ✅ Les patterns UI sont corrects ?
- ✅ Les tests sont prévus ?
- ✅ Rien ne manque par rapport aux acceptance criteria ?

**Si tu veux corriger :**
```
OK mais : 
- Ajoute un composant columns.tsx pour les colonnes de la DataTable (séparé du page.tsx)
- Le formulaire doit aussi gérer l'upload de la photo du permis
- Commence par le Zod schema et les server actions, puis les pages
```

**Si tout est bon :**
```
OK, procède. Commence par le Zod schema et les server actions.
```

---

## Étape 4 — Claude implémente

Claude code fichier par fichier, dans l'ordre que tu as validé.

**4a. Validation Zod**

Claude crée `src/lib/validations/client.ts` :
```typescript
import { z } from "zod";

export const clientSchema = z.object({
  firstName: z.string().min(1, "Prénom requis").max(100),
  lastName: z.string().min(1, "Nom requis").max(100),
  email: z.string().email("Email invalide"),
  phone: z.string().regex(/^\+41/, "Numéro suisse requis"),
  licenseNumber: z.string().min(1, "N° de permis requis"),
});

export type ClientFormData = z.infer<typeof clientSchema>;
```

→ **Hook Prettier se déclenche :** auto-format du fichier (non-bloquant, Claude continue sans interruption).

**4b. Server Actions**

Claude crée `src/actions/client.actions.ts` avec `createClient`, `updateClient`, `softDeleteClient`, etc.

→ Prettier formate encore. Claude n'est jamais bloqué — la validation complète (tsc + lint + tests) se fait à l'étape 8, avant le commit.

**4c. Pages et composants**

Claude crée les pages une par une en suivant les patterns du skill `locafleet-ui` :
- `clients/page.tsx` → Pattern A (liste avec DataTable)
- `clients/[id]/page.tsx` → Pattern B (détail avec cards)
- `clients/new/page.tsx` et `clients/[id]/edit/page.tsx` → formulaire partagé
- `client-form.tsx` → composant 'use client' avec react-hook-form + Zod

→ Prettier auto-format après chaque fichier.

**Tu peux intervenir à tout moment :**
```
Stop. La DataTable doit avoir une colonne "Permis" en plus. Ajoute-la.
```

Claude modifie, Prettier formate, et continue.

---

## Étape 5 — Claude écrit les tests unitaires

Le slash command `/implement-us` inclut l'instruction d'écrire les tests. Claude enchaîne automatiquement après le code.

**5a. Tests Zod**

Claude crée `src/lib/validations/client.test.ts` :
```typescript
describe("clientSchema", () => {
  it("accepte un client valide");
  it("rejette un email invalide");
  it("rejette un nom vide");
  it("rejette un téléphone non suisse");
});
```

**5b. Tests Server Actions**

Claude crée `src/actions/client.actions.test.ts` :
```typescript
describe("createClient", () => {
  it("crée avec le tenantId de la session");      // Happy path
  it("refuse si l'utilisateur est viewer");        // Auth
  it("rejette les données invalides (Zod)");       // Validation
});

describe("softDeleteClient", () => {
  it("met à jour deletedAt au lieu de supprimer");
  it("refuse si le client a des contrats actifs");
});

describe("getClients", () => {
  it("retourne uniquement les clients du tenant");
  it("exclut les clients soft-deleted");
  it("filtre par recherche nom/email");
});
```

**5c. Claude lance les tests**

```bash
npx vitest run src/lib/validations/client.test.ts
npx vitest run src/actions/client.actions.test.ts
```

Si un test échoue, Claude le voit, analyse l'erreur, et corrige soit le test soit le code source. Il relance jusqu'à ce que tous soient verts.

**Tu vois dans le terminal :**
```
✓ src/lib/validations/client.test.ts (4 tests) 12ms
✓ src/actions/client.actions.test.ts (8 tests) 45ms

Test Files  2 passed (2)
     Tests  12 passed (12)
```

---

## Étape 6 — Code review automatique

**Toi :**
```
/review
```

Le slash command injecte les instructions de review. Claude exécute `git diff`, analyse TOUS les changements et vérifie :

| Check | Ce que Claude vérifie |
|-------|----------------------|
| 🔒 Sécurité | `tenantId` filtré sur CHAQUE requête DB ? Auth check sur chaque action ? |
| 🧩 TypeScript | Pas de `any` ? Types corrects ? |
| ⚠️ Error handling | Erreurs propagées correctement ? Toast pour le feedback utilisateur ? |
| 🇨🇭 Format suisse | CHF avec apostrophe ? Dates DD.MM.YYYY ? |
| 🎨 Design system | Couleurs, badges, patterns conformes au skill `locafleet-ui` ? |
| 🧪 Tests | Chaque Server Action a un test ? Chaque Zod schema a un test ? |
| 🌍 i18n | Textes dans les fichiers de traduction et pas en dur ? |
| 📁 Structure | Fichiers au bon endroit selon les conventions `locafleet-stack` ? |

**Claude sort un rapport :**

> **Code Review — US-3.1 CRUD Clients**
>
> ✅ tenantId filtré sur toutes les requêtes (5/5 actions)
> ✅ Auth check sur createClient, updateClient, softDeleteClient
> ✅ Zod validation côté serveur sur toutes les mutations
> ✅ 12 unit tests passants
> ✅ Structure de fichiers conforme
>
> ⚠️ `client.actions.ts:67` — `softDeleteClient` ne vérifie pas si le client a des contrats actifs avant suppression
> ⚠️ `clients/page.tsx:34` — Le montant dans le tooltip est affiché sans formatting CHF
> ⚠️ `client-form.tsx:12` — Le label "License Number" est en dur en anglais au lieu d'utiliser `t("clients.licenseNumber")`

**Toi :**
```
Corrige les 3 warnings
```

Claude modifie les 3 fichiers. Prettier formate. Il relance les tests impactés pour vérifier qu'il n'a rien cassé :

```bash
npx vitest run src/actions/client.actions.test.ts
```

Tous verts ✅.

---

## Étape 7 — Test manuel dans le navigateur

**Toi, dans Chrome sur `localhost:3000` :**

Tu testes le parcours complet en suivant les acceptance criteria Gherkin de l'US :

| Test | Action | Résultat attendu |
|------|--------|-----------------|
| Créer | /clients → "Nouveau" → remplir → "Créer" | Redirection vers fiche client, toast succès |
| Lire | /clients → voir la liste | DataTable avec pagination, recherche fonctionnelle |
| Modifier | Fiche client → "Modifier" → changer le tel → "Enregistrer" | Tel mis à jour, toast succès |
| Supprimer | Fiche client → "Supprimer" → dialog confirmation → "Confirmer" | Retour à la liste, client absent |
| Sécurité | Se connecter en viewer, essayer de créer | Bouton "Nouveau" absent ou erreur "Non autorisé" |

**Si un truc ne marche pas :**
```
Quand je clique "Supprimer" et que je confirme, le client reste dans la liste. 
Le soft delete ne rafraîchit pas la page.
```

Claude investigue (probablement un `revalidatePath` manquant), corrige, relance les tests, tu retestes.

---

## Étape 8 — Check complet + Commit + Push

**Toi :**
```
Lance le check complet
```

**Claude exécute :**
```bash
npm run check
```

Ce qui lance séquentiellement :
```bash
npx tsc --noEmit          # Type-check : 0 errors ✅
npm run lint               # ESLint : 0 warnings ✅
npx vitest run             # 12 tests passed ✅
```

Si tout passe, le script crée `/tmp/locafleet-pre-commit-pass` — ce qui déverrouille le `git commit` (hook block-at-commit).

**Si tout est vert :**
```
Commit et push avec un message conventionnel
```

**Claude exécute :**
```bash
git add .
git status
# Vérifie qu'il n'y a pas de fichiers indésirables (.env, node_modules...)
git commit -m "feat(clients): implement US-3.1 — CRUD with soft delete, validation, and data table

- Add Zod validation schema for client form
- Add Server Actions: create, update, softDelete, getAll, getById
- Add client list page (Pattern A) with DataTable and search
- Add client detail page (Pattern B) with info cards
- Add client form component (create + edit)
- Add i18n keys (FR/EN)
- Add 12 unit tests (actions + validations)
- Verify tenantId filtering on all queries"

git push origin feat/US-3.1-crud-clients
```

---

## Étape 9 — Tests E2E (si fin d'Epic)

**Cette étape ne se fait PAS à chaque US.** Elle se fait quand tu as terminé toutes les US d'un Epic.

Par exemple, après avoir fini US-3.1 (CRUD Clients) + US-3.2 (Wizard Contrats) + US-3.3 (PDF Contrats) + US-3.4 (Tarification), tu as complété l'Epic 3.

**Toi :**
```
L'Epic 3 est terminé. Écris les tests E2E Playwright pour le parcours complet 
clients + contrats. Lis les acceptance criteria de toutes les US de l'Epic 3 
dans docs/prd/23-mvp-workflow.md.
```

**Claude crée :**

`e2e/clients.spec.ts` — CRUD client complet :
```typescript
test("créer un nouveau client");
test("rechercher un client");
test("modifier un client");
test("supprimer un client avec confirmation");
```

`e2e/contracts.spec.ts` — Cycle de vie contrat :
```typescript
test("parcours complet : wizard → création → inspection → facturation");
```

**Claude lance :**
```bash
npx playwright test e2e/clients.spec.ts e2e/contracts.spec.ts
```

Si un test E2E échoue, Claude analyse la trace (screenshots, vidéo), corrige, et relance.

**Une fois tous verts :**
```
Commit les tests E2E et push
```

```bash
git add e2e/
git commit -m "test(e2e): add Playwright tests for Epic 3 — clients and contracts"
git push origin feat/US-3.1-crud-clients
```

---

## Étape 10 — Nettoyage et prochaine US

**Toi :**
```
/compact
```

Le contexte est compressé en un résumé structuré (status, travail complété, décisions prises). Claude conserve la mémoire de la session mais libère le contexte pour la suite. C'est préférable à `/clear` qui efface tout.

> **Astuce avancée :** Si tu veux analyser les erreurs de la session pour améliorer CLAUDE.md (Compound Engineering), fais-le AVANT `/compact` :
> ```
> Résume les erreurs que tu as faites dans cette session et propose des ajouts à CLAUDE.md.
> ```

**Puis :**
```
git checkout develop
git merge feat/US-3.1-crud-clients
git checkout -b feat/US-3.2-wizard-contrats
```

Et tu relances `/implement-us US-3.2`.

---

## Résumé — Commandes dans l'ordre

```bash
# 1. Branche
git checkout -b feat/US-3.1-crud-clients

# 2. Plan + Implémentation + Tests
/implement-us US-3.1
# → Claude : plan → approval → code → unit tests → self-review

# 3. Review (avec subagents security-reviewer + db-analyst)
/review
# → Claude : git diff → rapport → corrections

# 4. Test manuel (toi dans le navigateur)

# 5. Check final + commit (block-at-commit hook)
npm run check              # tsc + lint + unit tests → crée le pass file
git add . && git commit    # hook vérifie le pass file → autorisé ✅

# 6. Push
git push origin feat/US-3.1-crud-clients

# 7. E2E (fin d'Epic seulement)
/test-us Epic-3            # Claude écrit les tests E2E
npm run e2e                # Playwright

# 8. Compound Engineering (avant nettoyage)
"Résume tes erreurs et propose des ajouts CLAUDE.md"

# 9. Nettoyage
/compact                   # résumé préservé (préférer à /clear)
```

---

## Ce qui est garanti vs ce qui dépend de toi

| Élément | Garanti automatiquement | Dépend de ton prompt |
|---------|------------------------|---------------------|
| CLAUDE.md chargé | ✅ Toujours | — |
| Hook Prettier après edit | ✅ Toujours | — |
| Skills scannés (descriptions) | ✅ Toujours | — |
| Skills chargés (contenu complet) | 🟡 Probable si la description matche | Renforcer avec `/implement-us` |
| PRD lu en détail | ❌ Non | `/implement-us` force la lecture |
| Schema.ts consulté | ❌ Non | `/implement-us` + orchestrateur |
| Specs UI consultées | ❌ Non | `/implement-us` + orchestrateur |
| Tests écrits | ❌ Non | `/implement-us` inclut l'instruction |
| Code review | ❌ Non | `/review` |
| E2E tests | ❌ Non | Toi en fin d'Epic |

**Conclusion :** Sans les slash commands, tu dois tout spécifier manuellement à chaque prompt. Avec `/implement-us`, `/review`, et `/test-us`, le workflow complet est déclenché par 3 commandes.
