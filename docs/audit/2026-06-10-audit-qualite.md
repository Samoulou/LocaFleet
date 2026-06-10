# Audit qualité LocaFleet — 10.06.2026

Audit complet : architecture technique, sécurité backend, qualité frontend, code mort, hygiène du dépôt et couverture de tests.

## Synthèse

**Verdict global : base de code saine et disciplinée, avec quelques risques sérieux ciblés.**

| Domaine | État |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ 0 erreur |
| Tests unitaires | ✅ 923 tests / 54 fichiers, tous verts |
| ESLint | ⚠️ 2 erreurs, 31 warnings |
| Isolation multi-tenant | ✅ 18/18 actions filtrent par `tenantId` |
| Validation Zod | ✅ 18/18 actions valident les entrées |
| Sécurité | 🔴 2 points critiques (copilote IA, intégrité FK) |
| Code mort | ⚠️ ~10 dépendances inutilisées, fichier 17 Mo commité |
| Tests E2E | 🔴 ~14 % des fonctionnalités couvertes (auth + layout uniquement) |
| Cohérence doc/code | ⚠️ CLAUDE.md décrit Hono et planby, absents du code réel |

**Top 5 des actions prioritaires :**

1. Durcir le copilote IA (`src/app/api/ai/chat/route.ts`) : injection de prompt, absence de rate limiting, clé API placeholder silencieuse.
2. Définir explicitement le comportement `onDelete` des clés étrangères critiques dans `src/db/schema.ts` (contrats, factures, dossiers).
3. Supprimer `trace-login.json` (17 Mo, commité dans git) et purger l'historique si nécessaire.
4. Écrire les tests unitaires manquants pour `listContracts`, `getContractById`, `getDashboardStats`, `getPlanningData` (logique métier à haut risque non testée).
5. Couvrir en E2E le parcours critique : création contrat → approbation → inspection retour → clôture → facture.

---

## 1. Checks automatiques

### TypeScript
`npx tsc --noEmit` : **0 erreur**. Aucun `any`, aucun `@ts-ignore`, aucun cast `as any` dans tout `src/`. Excellent.

### Tests unitaires
`npm run test` : **923 tests passent** (54 fichiers, ~42 s). Aucun test flaky observé.

### ESLint — 2 erreurs, 31 warnings

**Erreurs (à corriger) :**
- `src/components/layout/theme-toggle.tsx:20` — `setState` synchrone dans un `useEffect` (`setMounted(true)`). Pattern classique d'hydratation mais signalé par le React Compiler ; remplacer par `useSyncExternalStore` ou la prop `suppressHydrationWarning` de next-themes.
- `src/components/dashboard/vehicle-picker-dialog.tsx:38` — `setSearch("")` synchrone dans un effet. Réinitialiser la recherche dans le handler `onOpenChange` plutôt que dans un effet.

**Warnings notables :**
- `src/components/planning/planning-calendar.tsx` — 3 symboles morts (`formatDate`, `INITIAL_DAYS`, `generateDayRange`) + dépendances manquantes dans un `useEffect` (ligne 495 : `days`, `today`) → risque de bug de rafraîchissement du calendrier.
- `useReactTable` incompatible avec le React Compiler (3 data-tables) — informatif, pas d'action requise.
- Directive `eslint-disable` inutile dans `inspection-photo-upload.test.tsx:41`.

### Build de production
Le build échoue dans cet environnement uniquement parce que `next/font/google` télécharge Geist/Geist Mono au moment du build (réseau bloqué ici). **Risque réel : le build dépend de la disponibilité de Google Fonts.** Recommandation : passer à `next/font/local` avec les fichiers de police vendorés — build hermétique, CI plus fiable, et conforme RGPD/nLPD.

---

## 2. Architecture technique

### Écarts entre CLAUDE.md et le code réel

Le CLAUDE.md (source de vérité du projet) décrit une architecture qui ne correspond plus au code :

| CLAUDE.md affirme | Réalité |
|---|---|
| « Hono API routes pour PDF, email, background tasks » | **Hono n'est importé nulle part.** Les routes `src/app/api/` sont des Route Handlers Next.js natifs (`ai/chat`, `contracts/[id]/pdf`, `auth/[...all]`). |
| « Planning uses planby (NOT react-big-calendar) » | **planby n'est importé nulle part.** `planning-calendar.tsx` (1 262 lignes) est un calendrier entièrement custom. |
| Stack mentionne Hono | `hono` + `@hono/node-server` installés mais morts. |

→ **Mettre à jour le CLAUDE.md** (ou réintroduire ces libs si c'était l'intention). Un doc de référence faux est pire qu'absent : il guide les futurs développements (humains et IA) dans la mauvaise direction.

### Points forts
- Server Actions bien isolées dans `src/actions/` avec un type de retour uniforme `ActionResult<T>`.
- Schéma Drizzle centralisé (`src/db/schema.ts`), seul point de vérité.
- RBAC via `requirePermission(resource, action)` appliqué systématiquement.
- i18n (next-intl) avec routing par locale, bibliothèques lourdes (`@react-pdf/renderer`) confinées aux routes serveur.
- Génération de numéros (contrat/facture/dossier) avec verrou (`src/lib/number-utils.ts`).

### Points faibles
- `planning-calendar.tsx` : 1 262 lignes, mélange rendu, drag-drop, gestion des lanes, dialogues. À découper (grille / légende / dialogues / helpers).
- Pas de couche « repository » : les actions accèdent directement à Drizzle — acceptable à cette taille, mais la duplication des clauses `and(eq(tenantId...))` augmente le risque d'oubli futur. Un helper `tenantScoped(table, tenantId)` réduirait ce risque.

---

## 3. Backend & sécurité

### 🔴 Critique

**3.1 Copilote IA — injection de prompt et absence de garde-fous**
`src/app/api/ai/chat/route.ts:72`
- Les messages utilisateur sont transmis bruts au LLM avec un system prompt contenant le contexte du schéma. Un utilisateur peut tenter de détourner les instructions (les outils sont read-only et scopés tenant, ce qui limite l'impact, mais aucun durcissement explicite du system prompt).
- **Pas de rate limiting** : boucle jusqu'à 10 itérations d'appels LLM par requête, sans quota par utilisateur/tenant ni suivi de coût (`route.ts:83-204`). Exposition financière directe via OpenRouter.
- `src/lib/ai/openrouter.ts:16` : `apiKey: process.env.OPENROUTER_API_KEY ?? "sk-placeholder"` — échec silencieux et confus à l'exécution si la variable manque. Lever une erreur au démarrage.
- `src/lib/ai/tool-executors.ts:161-195` : `getClientContracts` filtre par `tenantId` sur la jointure mais ne vérifie pas que le client existe dans le tenant — sans risque de fuite inter-tenant ici, mais le pattern est fragile ; ajouter une vérification d'existence.

**3.2 Intégrité référentielle — `onDelete` non défini**
`src/db/schema.ts` (lignes ~503-508, 699-703, 770-775)
`rentalContracts.clientId/vehicleId`, `invoices.contractId/clientId`, `rentalDossiers.contractId/invoiceId` n'ont aucun comportement `onDelete`. Le défaut PostgreSQL (`NO ACTION`) bloquera les suppressions, mais le choix n'est pas documenté ni testé.
**Recommandation : `onDelete: "restrict"` explicite** (pas `cascade` — contrats et factures sont des données comptables/légales qui ne doivent jamais disparaître en cascade). Les clients sont soft-deleted, ce qui réduit le risque actuel, mais l'intention doit être codée.

### 🟠 Élevé

**3.3 Race condition sur la double réservation** — `src/actions/contracts.ts:209-227`
Le check de chevauchement véhicule est fait en `SELECT` dans la transaction, sans verrou. Deux requêtes concurrentes peuvent toutes deux passer le check puis insérer. Solutions : `SELECT ... FOR UPDATE` sur le véhicule, ou mieux, **contrainte d'exclusion PostgreSQL** (`EXCLUDE USING gist` sur `(vehicle_id, daterange(start_date, end_date))` pour les statuts actifs) — garantie au niveau DB.

**3.4 Scoping des audit logs** — `src/actions/audit-logs.ts:70`
`getEntityAuditLogs` vérifie la permission `vehicles.read` quel que soit le type d'entité demandé : un agent avec lecture véhicules peut lire les logs d'audit de n'importe quelle entité (clients, factures…) de son tenant. Vérifier la permission correspondant à `entityType`.

### 🟡 Moyen

- **Index manquants** sur les FK les plus sollicitées : `rentalContracts.clientId`, `rentalContracts.vehicleId`, `invoices.contractId`, `invoices.clientId` (PostgreSQL n'indexe **pas** automatiquement les FK). Impact direct sur les requêtes planning/chevauchement quand le volume montera.
- **Gestion d'erreur des transactions** (`src/actions/invoices.ts:75-147`) : tout est aplati en « Une erreur est survenue » ; distinguer au moins les violations de contrainte pour le debugging.
- **TVA codée à 0** dans la génération de facture — confirmé volontairement V1 ? À documenter, sinon c'est une bombe à retardement comptable.

### ✅ Points validés
- **18/18 actions serveur** : authentification + filtre `tenantId` + validation Zod + try/catch présents partout. Audit exhaustif, aucune fuite inter-tenant détectée.
- Pas d'injection SQL (aucun `sql` brut avec interpolation utilisateur), pas de secret en dur, seed utilisant des variables d'environnement.
- Messages d'erreur utilisateur en français, logs techniques en anglais — conforme.

---

## 4. Frontend

### Points forts
- Server Components par défaut respectés ; `'use client'` justifié dans les 82 composants concernés (Radix, formulaires).
- `Promise.all` utilisé pour les fetchs parallèles dans les pages (dashboard, vehicles, contracts).
- Bibliothèques lourdes hors du bundle client (`@react-pdf/renderer` uniquement côté serveur).
- Accessibilité globalement bonne : tous les Dialog/Sheet ont un titre, images avec `alt`, boutons icône avec `sr-only` (sauf le bouton fermer du copilote : `copilot-panel.tsx:63`, ajouter `aria-label`).

### Problèmes

**4.1 i18n contourné (élevé)** — chaînes françaises codées en dur dans des pages qui utilisent pourtant `getTranslations()` :
- `src/app/[locale]/(dashboard)/vehicles/page.tsx:45-86` (« Véhicules », « Nouveau véhicule », états vides…)
- `src/app/[locale]/(dashboard)/invoices/page.tsx:35-65` (« Factures », états vides…)

Si le switcher de langue est utilisé, ces pages resteront en français. Migrer vers les clés next-intl comme le font contracts/clients.

**4.2 Formatage dupliqué (moyen)** :
- `src/components/contracts/contract-detail.tsx:47-63` — `formatDate`/`formatDateShort` réimplémentés inline (padding manuel) au lieu de `src/lib/utils.ts`.
- `src/components/inspections/return-inspection-form.tsx:285,304` — `toLocaleString("de-CH")` direct au lieu de `formatMileage()`.
- Le PDF (`contract-pdf-template.tsx:197-213`) redéfinit ses formateurs — acceptable dans le contexte react-pdf mais à factoriser si possible.

**4.3 Composants trop gros** (>400 lignes, candidats au découpage) :
1. `planning-calendar.tsx` — **1 262 lignes** (priorité absolue)
2. `return-inspection-form.tsx` — 574 lignes, 13 `useState`
3. `new-contract-sheet.tsx` — 470 lignes
4. `contract-pdf-template.tsx` — 465 lignes (OK pour un template PDF)
5. `contract-detail.tsx` — 461 lignes
6. `vehicle-form.tsx` / `inspection-photo-upload.tsx` — 454 lignes
7. `departure-inspection-form.tsx` — 404 lignes

Les formulaires d'inspection gèrent leur état avec 10-13 `useState` — migrer vers `react-hook-form` (déjà dans package.json… et `@hookform/resolvers` est installé mais jamais utilisé).

**4.4 Divers (bas)** : pas de `generateMetadata()` sur les pages détail ; pas de Suspense granulaire (KPI cards/filtres) — streaming non exploité ; acceptable pour un back-office.

---

## 5. Code mort & hygiène du dépôt

### 🔴 `trace-login.json` — 17,3 Mo commité dans git
Trace de performance Chrome à la racine, **trackée dans git** et non ignorée. Aucune donnée sensible détectée (métadonnées de threads), mais : 17 Mo de bloat sur chaque clone.
→ `git rm trace-login.json`, ajouter au `.gitignore`. Pour purger l'historique : `git filter-repo` (optionnel, nécessite un force-push concerté).

### Dépendances inutilisées (11 paquets, vérifié par grep sur tout `src/` et configs)

| Paquet | Note |
|---|---|
| `hono`, `@hono/node-server` | Contredit le CLAUDE.md |
| `planby` | Contredit le CLAUDE.md |
| `pino`, `pino-pretty` | Aucun logger utilisé — voir remarque ci-dessous |
| `recharts` | Aucun graphique dans l'app |
| `xlsx` | Aucun export Excel |
| `isomorphic-dompurify` | Aucune sanitisation HTML |
| `@react-email/components` | Emails envoyés en HTML brut via Resend (`src/actions/inspections.ts`) |
| `@hookform/resolvers` | react-hook-form sous-exploité (voir 4.3) |
| `tw-animate-css` (dev) | Non référencé |

Remarque : la mort de `pino` signifie qu'**il n'y a aucun logging structuré** — les erreurs serveur partent en `console.error` implicite des catch. Pour une app de production sur Railway, brancher pino (ou le retirer et assumer).

### Exports morts
- `src/types/index.ts:31-62` — 7 types inspection (`SelectInspection`, `InsertInspection`, etc.) jamais importés.
- `src/lib/number-utils.ts:32-48` — `acquireNumberLock` exporté mais usage interne uniquement (retirer `export`).
- Types dupliqués : `ClientListItem` et `ContractSummary` définis à la fois dans `src/types/index.ts` et `src/actions/clients.ts` — garder une seule source.
- Maps de labels statuts dupliquées : `vehicle-activity-log.tsx:47-58` vs `vehicle-status-badge.tsx` ; `maintenance-alerts-list.tsx:17-35`.

### ✅ Hygiène exemplaire par ailleurs
0 `console.log`, 0 `debugger`, 0 `@ts-ignore`, 0 `as any`, 0 TODO/FIXME, 0 `eslint-disable` (sauf 1 inutile en test), 0 code commenté, pas de `.env` commité, seed sans secrets en dur, aucun `test.skip`/`.only`.

---

## 6. Tests — couverture et plan

### État actuel

| Catégorie | Couverture | Détail |
|---|---|---|
| Server Actions | **87 %** (40/46 fonctions) | Bon |
| Schémas Zod | **95 %** (18/19) | Très bon |
| E2E | **~14 %** (2/14 features) | 🔴 Critique : seulement auth + layout |

### 🔴 Logique métier à haut risque NON testée

| Fonction | Fichier | Pourquoi c'est risqué |
|---|---|---|
| `listContracts()` | `src/actions/contracts.ts:462` | Filtres, pagination, tri, isolation tenant — cœur de l'app |
| `getContractById()` | `src/actions/get-contract.ts:82` | Page détail contrat ; pas de test d'isolation tenant ni de 404 |
| `getDashboardStats()` | `src/actions/dashboard.ts:64` | Calculs de revenus et de KPIs — erreurs invisibles |
| `getActiveRentals()` / `getReturnsDue()` / `getMaintenanceAlerts()` | `src/actions/dashboard.ts:176,240,310` | Logique de dates/retards |
| `getPlanningData()` | `src/actions/planning.ts:62` | Disponibilité véhicules, chevauchements — bugs = double réservation visuelle |
| `getVehiclesForContractPicker()` | `src/actions/vehicles.ts:222` | Filtre de disponibilité |
| `getVehicleWithPhotos()` | `src/actions/vehicles.ts:592` | URLs signées |
| `getClientsForTenant()` / `getRentalOptionsForTenant()` | `src/actions/contracts.ts:59,103` | Données du formulaire contrat |

Plus : la **TVA n'a aucun scénario de test** (taux codé à 0), et la numérotation contrat/facture n'est testée que via mocks (pas de test d'intégration de concurrence).

### 🔴 E2E à écrire (par priorité)

1. **Cycle de vie contrat** : création brouillon → approbation → inspection départ → inspection retour → validation → clôture → facture générée. C'est LE parcours métier ; zéro couverture aujourd'hui.
2. **Paiement de facture** : liste → détail → enregistrement paiement → statut payé.
3. **Inspections avec photos** (upload/compression — déjà fragile par nature).
4. **CRUD véhicules** et **CRUD clients**.
5. **Planning** : affichage timeline, blocs maintenance.
6. Dashboard, catégories, copilote IA (smoke tests).

Pré-requis : stratégie de seed dédiée aux E2E (base de test isolée), sinon les specs seront flaky.

### Configuration de test

- `vitest.config.ts` : **aucun seuil de couverture** — ajouter `thresholds: { lines: 80, functions: 85, branches: 75 }` pour empêcher la régression ; envisager `environment: "node"` pour les tests d'actions (jsdom inutile et plus lent).
- `playwright.config.ts` : activer `video: "retain-on-failure"` ; prévoir un projet « setup » de seed DB.

---

## 7. Plan d'action priorisé

### Semaine 1 — risques
1. Copilote IA : rate limiting (par utilisateur/tenant), fail-fast si `OPENROUTER_API_KEY` absente, durcissement du system prompt.
2. `schema.ts` : `onDelete: "restrict"` explicite sur contrats/factures/dossiers + index sur les 4 FK chaudes ; migration.
3. Contrainte d'exclusion PostgreSQL contre la double réservation (ou `FOR UPDATE`).
4. Supprimer `trace-login.json` du dépôt + `.gitignore`.
5. Corriger les 2 erreurs ESLint et le `useEffect` aux dépendances manquantes du planning.

### Semaines 2-3 — dette et tests
6. Tests unitaires des 10 fonctions non testées (dashboard, planning, contrats en tête).
7. E2E du cycle de vie contrat complet + paiement facture.
8. Seuils de couverture vitest.
9. Purge des 11 dépendances mortes ; décision logging (brancher pino ou retirer).
10. Mise à jour du CLAUDE.md (Hono, planby, architecture réelle).

### Mois 1+ — qualité continue
11. Découpage de `planning-calendar.tsx` et des formulaires d'inspection (migration react-hook-form).
12. i18n des pages vehicles/invoices ; consolidation des formateurs de dates/montants.
13. Fix audit-logs scoping ; audit trail des suppressions de photos.
14. Polices auto-hébergées (`next/font/local`) pour un build hermétique.
15. Clarifier/implémenter la TVA ou documenter l'exonération V1.
