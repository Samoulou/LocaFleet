# 24 — CRM multi-activités : audit, delta et roadmap

> **Statut** : proposition à valider avec le product owner
> **Date** : 11.06.2026
> **Origine** : « liste au père Noël » du gérant (location de véhicules + déménagement + transports annexes)
> **Objet** : faire de LocaFleet le CRM de référence pour une société multi-activités, en capitalisant sur l'existant (location) au lieu de le refondre.

---

## 1. Synthèse

LocaFleet couvre aujourd'hui très bien le **cycle location** : flotte, clients, contrats (PDF), inspections, factures, paiements, planning. La liste de souhaits introduit un changement de paradigme : une entité centrale **Événement** typée par **Fonction** (Location, Déménagement, Transport scolaire…), à laquelle on attribue **des véhicules ET des employés**, et qui alimente offres, contrats, facturation et heures.

**Verdict de l'audit** : ~40 % de la liste est déjà en place ou presque ; le delta tient en **9 chantiers** réalisables en **7 phases** sans refonte — le multi-tenant, le RBAC, les patterns PDF/numérotation/machines à états existants absorbent tout le nouveau périmètre.

---

## 2. Audit : la liste au père Noël vs l'existant

| # | Souhait | État | Détail |
|---|---------|:----:|--------|
| 1 | Liste employés | 🟡 | Table `users` (rôles admin/agent/viewer) + gestion dans /settings. **Manque** : rôle terrain restreint, taux horaire, type d'emploi, et surtout un **flux d'invitation/création d'utilisateur** (inexistant : seuls le changement de rôle et l'activation existent dans `src/actions/users.ts`) |
| 2 | Liste véhicules | ✅ | CRUD complet, photos, catégories + tarifs, statuts, maintenance, historique |
| 3 | Base clients | ✅ | CRUD, documents (permis, pièce d'identité…), flag « de confiance », soft delete |
| 4 | Liste fonctions (location, déménagement) | ❌ | Produit 100 % location aujourd'hui. Aucune notion d'activité/fonction |
| 5 | Attribution véhicules + employés aux événements, ⚠️ si doublon mais pas d'interdit | ❌ | Pas d'entité événement. La détection de chevauchement véhicule existe (`createDraftContract`, `src/actions/contracts.ts:211-236`) mais elle est **bloquante** et codée en dur dans l'action ; aucune attribution d'employés nulle part |
| 6 | Création d'offres, PDF | ❌ | Aucune notion d'offre/devis. Le pattern PDF (`@react-pdf/renderer`) est en place et clonable |
| 7 | Création d'événement depuis offre | ❌ | Dépend des deux modules absents |
| 8 | Contrat depuis l'événement (module PDF déjà en place) | 🟡 | Le module contrat + PDF est complet (`src/app/api/contracts/[id]/pdf/route.tsx`) ; il manque le pont événement → contrat |
| 9 | Facture depuis l'événement, ou pas + suivi facturation et rappels | 🟡 | Facturation contrat opérationnelle (machine à états, paiements, échéance). **Manque** : facture liée à un événement, **PDF de facture** (absent aussi du flux actuel !), et tout le volet **rappels/relances** |
| 10 | Commentaires des employés sur chaque événement | 🟡 | Seulement des champs `notes` libres sur contrats/inspections. Pas de fil de commentaires horodaté multi-auteurs |
| 11 | Tous les événements passent en facturation, validation manuelle, mensuelle ou auto cochable | ❌ | La facture naît du contrat automatiquement ; aucune « file de facturation », aucun regroupement mensuel, aucun mode auto |
| 12 | Notation des heures (via événements + hors événements, plusieurs unités) | ❌ | Rien. Ni heures, ni unités (courses scolaires), ni lien paie/facturation |
| 13 | Système de tasks type Google Tasks (convertibles en événement, liables) | ❌ | Rien |
| 14 | ⚠️ doublons heures employés / chevauchement véhicules | 🟡 | Chevauchement véhicule : oui mais bloquant et limité aux contrats. Chevauchement employé : impossible (pas d'attribution) |

**Atouts existants à réutiliser tels quels** (vérifiés dans le code) :
- Multi-tenant complet : toutes les tables et requêtes scopées `tenantId` → les employés sont simplement des `users` du tenant, **aucune refonte**.
- Générateurs de numéros sous advisory lock (`src/lib/number-utils.ts` : `CTR-`, `FAC-`, `DOS-`) → ajouter `EVT-`, `OFF-`.
- Pattern PDF route + template (`route.tsx` + composant) → cloner pour offres et factures.
- Machine à états factures (`ALLOWED_TRANSITIONS` dans `src/actions/invoices.ts`) + paiements : les factures d'événements y entrent telles quelles.
- Pattern CRUD de réglages (`src/actions/categories.ts` + UI /settings/categories) → modèle exact pour les fonctions.
- Planning custom (grille véhicules × jours avec empilement en « lanes », `src/components/planning/planning-calendar.tsx`) : la structure accepte un 3ᵉ type de barre (événements) sans réécriture.
- RBAC par matrice figée (`src/lib/rbac.ts`) : extension naturelle à un 4ᵉ rôle et 4 nouvelles ressources.

---

## 3. Le delta : 9 chantiers

### D1 — Fonctions (activités) configurables
Table `fonctions` par tenant, sur le modèle de `rentalOptions`/`vehicleCategories`. Le comportement est piloté par des **drapeaux de capacité** (pas d'enum codé en dur → le gérant peut créer « Transport scolaire », « Convoyage »… sans développement) :
- `requiresEmployees` : Déménagement = oui → ⚠️ si aucun employé attribué, **mais validation possible** (règle n° 14 de la liste)
- `allowsContract` : Location = oui → bouton « Générer le contrat »
- `defaultTimeUnit` : Transport scolaire = `trips` (courses)
- `color` : couleur des barres dans le planning

Seed : « Location » (allowsContract), « Déménagement » (requiresEmployees), « Transport scolaire » (trips).

### D2 — Événements : l'entité centrale
Table `events` : n° `EVT-2026-0001`, fonction, client, titre, statuts `draft → confirmed → in_progress → completed / cancelled`, dates début/fin, lieu + destination (déménagement), montant convenu, description/notes.
Attributions **n-n** : `eventVehicles` (événement ↔ véhicules) et `eventEmployees` (événement ↔ users, avec rôle libre : chauffeur, porteur…).
**Règle d'or** : un événement ne touche **jamais** `vehicles.status` (qui reste piloté par le cycle contrat loué/disponible).

### D3 — Moteur de conflits : avertir sans interdire
Extraction de la logique de chevauchement de `createDraftContract` vers `src/lib/conflicts.ts` :
- `checkVehicleConflicts(...)` : chevauchement contre les **contrats** (formule et statuts actuels conservés) **et** les **événements** (via `eventVehicles`)
- `checkEmployeeConflicts(...)` : chevauchement contre les événements attribués **et** les saisies d'heures

Comportements différenciés :
- **Contrats directs** : restent **bloquants** (comportement actuel, inchangé)
- **Événements / heures** : **warning en 2 temps** — le formulaire affiche les conflits en direct (bandeaux ⚠️ : véhicule déjà pris, employé déjà pris, fonction exigeant un employé sans attribution) ; à la soumission le serveur revérifie et exige `acknowledgeConflicts: true` pour passer outre. On ne bloque jamais un conflit reconnu — exactement la demande « (!) si doublon mais pas d'interdit ».

### D4 — Offres (devis)
Table `quotes` : n° `OFF-2026-0001`, client, fonction, période prévue, lignes en JSONB (même forme que `invoices.lineItems`), totaux, validité, statuts `draft → sent → accepted / declined / expired`.
PDF par clonage du pattern contrat. Conversion `convertQuoteToEvent` (depuis `accepted` uniquement) : pré-remplit client/fonction/dates/montant convenu et trace `events.quoteId`. Envoi par e-mail via Resend + `emailLogs` (type `quote_sent`).

### D5 — Contrat depuis l'événement
`generateContractFromEvent` (visible si la fonction `allowsContract`) : choix d'un des véhicules de l'événement (1 contrat par véhicule), tarif pré-rempli mais ajustable, lien `rentalContracts.eventId`. Le check bloquant exclut la propre réservation de l'événement (`excludeEventId`). Tout le cycle existant (approbation → CG → PDF → inspections → clôture) reste la référence légale, intouché. La création directe de contrat (sans événement) **coexiste** (`eventId = null`).

### D6 — File de facturation (« le fichier facturation »)
- `events.billingStatus` : `to_review` (à valider) / `monthly` (attente du lot mensuel) / `invoiced` / `not_billed`
- À la complétion d'un événement, routage selon `clients.invoicingMode` (`manual` / `monthly` / `automatic` — la « case à cocher » de la liste, posée au niveau client) : facture immédiate, mise en attente mensuelle, ou file de validation manuelle
- `createInvoiceFromEvent` : lignes pré-remplies (montant convenu + heures non facturées + lignes manuelles), n° `FAC-`, marquage `events.invoiceId`
- **Facture mensuelle groupée** : n événements d'un client → 1 facture (une ligne par événement, période `periodStart`/`periodEnd`) ; relation portée par `events.invoiceId`, pas de table de jonction nécessaire ; relance du lot idempotente (garde `invoiceId IS NULL`)
- **PDF de facture** (profite aussi aux factures de contrats existantes) ; QR-facture suisse en incrément ultérieur
- UI : onglets sur /invoices — « File de facturation » / « Factures » / « Rappels »

### D7 — Rappels (relances d'impayés)
Table `invoiceReminders` : niveaux à la suisse (1ᵉʳ rappel / 2ᵉ rappel / mise en demeure), envoi e-mail français via Resend, traçé dans `emailLogs` (type `payment_reminder`) et sur la facture. Liste des impayés (`status = invoiced` et `dueDate` dépassée), échéance par défaut +30 jours. Envoi manuel en V1 (pas de planificateur dans la stack ; cron Railway possible ensuite).

### D8 — Heures employés
Table `timeEntries` : employé (user), date, **unité** `hours` / `trips` / `flat` (la demande « plusieurs unités possible »), heures début/fin (si `hours`), quantité, taux, description ; rattachée à un événement **ou autonome** (fonction + client seuls — cas transport scolaire). Warning de chevauchement (même mécanique 2 temps que D3). Récapitulatif mensuel par employé : Σ heures × `users.hourlyRate`, Σ courses — base précise pour la facturation, les heures supplémentaires et la paie des employés à l'heure ; export xlsx (dépendance déjà installée). Marquage `invoiceId` quand une saisie est facturée.

### D9 — Tasks + commentaires
- `tasks` : titre, échéance, assigné, fait/à faire, lien polymorphe vers n'importe quelle entité (pattern `auditLogs.entityType/entityId`), **conversion en événement** (`convertedEventId`). Page /tasks + widget « Mes tâches » au dashboard.
- `eventComments` : fil de commentaires horodaté par événement (auteur, date `DD.MM.YYYY HH:mm`) ; les employés commentent **leurs** événements assignés (supplément d'inventaire, heures supp., total d'heures…).

---

## 4. Architecture cible

### 4.1 Delta de schéma (`src/db/schema.ts`)

**9 nouvelles tables** (conventions existantes : camelCase TS / snake_case PG, `tenantId` partout, `uniqueIndex(numéro, tenantId)`, `createdAt`/`updatedAt`) :

| Table | Colonnes clés | FK notables |
|---|---|---|
| `fonctions` | name, color, requiresEmployees, allowsContract, defaultTimeUnit, isActive, sortOrder | tenant CASCADE |
| `events` | eventNumber, fonctionId, clientId, title, status, startDate/endDate, location/destination, agreedAmount, billingStatus, description, notes | fonction RESTRICT, client RESTRICT, invoiceId SET NULL, quoteId SET NULL |
| `eventVehicles` | eventId, vehicleId, notes — unique (eventId, vehicleId) | event CASCADE, vehicle RESTRICT |
| `eventEmployees` | eventId, userId, role (« chauffeur »…) — unique (eventId, userId) | event CASCADE, user RESTRICT |
| `eventComments` | eventId, authorUserId, body | event CASCADE, author SET NULL |
| `quotes` | quoteNumber, clientId, fonctionId, status, title, startDate/endDate, lineItems JSONB, subtotal/taxRate/taxAmount/totalAmount, validUntil, quotePdfUrl, sentAt/acceptedAt/declinedAt | client RESTRICT, fonction RESTRICT |
| `timeEntries` | userId, eventId?, fonctionId?, clientId?, entryDate, unit, startTime/endTime, quantity, unitRate, description, invoiceId? | user RESTRICT, event SET NULL |
| `tasks` | title, description, dueDate, assignedToUserId, isDone, completedAt, entityType/entityId (polymorphe), convertedEventId | assigné SET NULL |
| `invoiceReminders` | invoiceId, level (1-3), sentAt, sentByUserId, emailLogId, notes | invoice CASCADE |

**6 nouveaux enums** : `event_status` (draft/confirmed/in_progress/completed/cancelled), `event_billing_status` (to_review/monthly/invoiced/not_billed), `quote_status` (draft/sent/accepted/declined/expired), `time_entry_unit` (hours/trips/flat), `employment_type` (salaried/hourly), `invoicing_mode` (manual/monthly/automatic).
**Valeurs additives** (sûres avec `drizzle-kit push`) : `user_role` += `employee` ; `email_type` += `payment_reminder`, `quote_sent`.

**Modifications de tables existantes** :

| Table | Changement | Onde de choc |
|---|---|---|
| `users` | + `hourlyRate`, `employmentType`, `phone` (nullables) | Aucune sur l'existant ; Better Auth inchangé (champs non portés en session) |
| `rentalContracts` | + `eventId` nullable → events SET NULL | `events` est défini après → forward reference Drizzle (`AnyPgColumn`) |
| `invoices` | **`contractId` devient nullable** (aujourd'hui NOT NULL + RESTRICT, schema.ts:708) ; + `periodStart`/`periodEnd` | `getInvoiceById` passe d'innerJoin à leftJoin sur contrat/véhicule ; type `InvoiceDetail.contract` nullable ; blocs conditionnels sur la page détail. Origine d'une facture = `contractId` OU ≥1 événements via `events.invoiceId` (contrainte vérifiée dans les actions) |
| `clients` | + `invoicingMode` (défaut `manual`) | Aucune |
| `emailLogs` | + FK nullables `invoiceId`, `quoteId`, `eventId` | Étend le pattern existant (vehicleId/contractId/maintenanceId) |

### 4.2 RBAC (`src/lib/rbac.ts`)

- `Role` : + `employee` (4ᵉ rôle) ; `Resource` : + `events`, `quotes`, `tasks`, `timeEntries`. La matrice étant figée et exhaustive, TypeScript force à remplir chaque case.
- Proposition de matrice (cohérente avec l'existant — l'agent est déjà *read-only* sur invoices/payments, on garde ce niveau) :

| Ressource | admin | agent | viewer | **employee** |
|---|---|---|---|---|
| events | CRUD | CRUD | R | R (les siens) |
| quotes | CRUD | CRUD | R | — |
| tasks | CRUD | CRUD | R | R + update (les siennes) |
| timeEntries | CRUD | CRUD | R | C/R/U (les siennes) |
| vehicles / clients / contracts / inspections | (inchangé) | (inchangé) | (inchangé) | vehicles : R ; reste : — |

- Le **scoping par ligne** (l'employé ne voit que ses événements assignés, ses heures, ses tâches) ne s'exprime pas dans la matrice → filtre additionnel dans chaque action quand `role === "employee"` (via `eventEmployees.userId`). Commentaires : autorisés à l'employé sur ses événements assignés (cas particulier dans l'action).
- À mettre à jour en même temps : union `CurrentUser.role` (`src/lib/auth.ts`) et visibilité de la navigation (`src/components/layout/nav-config.ts`).
- **Prérequis P1** : flux d'invitation/création d'utilisateur par l'admin (n'existe pas aujourd'hui) — nécessaire pour créer les comptes employés.

### 4.3 Navigation (sidebar uniquement, convention existante)

Ajouts : **Événements** (liste + détail + création), **Offres**, **Tâches**, **Heures** ; « Facturation » = page /invoices enrichie d'onglets (file / factures / rappels) pour garder la sidebar sobre. Fonctions dans /settings/fonctions. Vue employé (rôle `employee`) : Mes événements, Mes heures, Mes tâches.

---

## 5. Roadmap proposée

| Phase | Contenu | Taille | Dépend de |
|---|---|:-:|:-:|
| **P1 — Socle multi-activités** | Schéma lot 1 (fonctions, champs RH users, rôle employee, enums, clients.invoicingMode) ; RBAC + auth + nav ; CRUD fonctions + seed ; **invitation d'utilisateurs** ; champs employé dans /settings | **M** | — |
| **P2 — Événements** | Schéma lot 2 (events + junctions + comments + rentalContracts.eventId) ; extraction moteur de conflits + refactor `createDraftContract` (comportement inchangé) ; CRUD événements + warnings 2 temps ; commentaires ; intégration planning ; numérotation EVT | **L** | P1 |
| **P3 — Offres** | quotes + machine à états + PDF + numérotation OFF + conversion → événement + envoi e-mail | **M** | P1 (P2 pour la conversion) |
| **P4a — Contrat ← événement** | `generateContractFromEvent` + dialogues + liens croisés | **S** | P2 |
| **P4b — Facturation des événements** | `invoices.contractId` nullable + corrections induites ; file de facturation (onglets /invoices) ; facture depuis événement ; routage par invoicingMode ; **PDF facture** | **L** | P2 |
| **P5 — Facturation avancée** | Lot mensuel (« Générer les factures du mois », idempotent) ; mode automatique ; rappels (table + e-mails + onglet) | **M** | P4b |
| **P6 — Heures & tâches** | timeEntries (warnings, récaps, export xlsx, lien facturation) ; tasks (+ conversion en événement, widget dashboard) | **M** | P2 (lien facture : P4b) |

- **Chemin critique** : P1 → P2 → P4b → P5. P3 ∥ P4a ; tasks avançable dès P2.
- **Parti pris** : livrer la valeur métier (planning multi-activités + warnings) avant de toucher aux écritures comptables (P4b, phase la plus sensible en régression).
- **Definition of done par phase** (CLAUDE.md) : tests unitaires de chaque Server Action et schéma Zod, e2e Playwright du parcours principal (ex. P2 : créer un déménagement avec conflit véhicule, valider malgré le warning ; P4b : compléter un événement → file → facture → PDF), i18n fr/en, `npm run check` vert.

---

## 6. Questions ouvertes à trancher (avec recommandations)

1. **Mois de facturation** : 1 facture par client et par mois calendaire, toutes fonctions confondues ? Événements à cheval sur deux mois → mois de fin ? *Reco : mois calendaire de la date de fin, une facture toutes fonctions, déclenchement par bouton manuel d'abord.*
2. **Flux location** : la création directe de contrat coexiste-t-elle avec événement → contrat ? Les contrats directs passent-ils aussi par la file de facturation ? *Reco : coexistence ; les contrats directs gardent leur auto-facturation actuelle.*
3. **Client obligatoire sur un événement ?** Les événements internes (convoyage, garage) plaideraient pour un client facultatif. *Reco : client obligatoire en V1, à assouplir si besoin réel.*
4. **TVA** : `taxRate` est codé à 0 aujourd'hui ; le déménagement est normalement soumis (8.1 %). Réglage par tenant, par fonction, ou par facture ? *Reco : taux par défaut par fonction, modifiable sur la facture.*
5. **Acceptation d'offre** : simple changement de statut interne, ou lien d'acceptation client par e-mail (le pattern `cgApprovalToken` des contrats est clonable) ? *Reco : interne en V1.*
6. **Rappels** : cadence (J+10/J+20/J+30 ?), frais de rappel aux niveaux 2-3 ? Envoi manuel (reco V1) ou automatique ?
7. **Heures** : validation par l'admin avant paie/facturation ? Définition des heures supplémentaires (seuil journalier/hebdomadaire) ? Format d'export paie ?
8. **Planning par employé** (lignes = employés) nécessaire en V1, ou la vue véhicules avec barres d'événements suffit-elle ? *Reco : V1 = vue véhicules, vue employés en V1.1.*
9. **Confirmation** : un événement ne change jamais le statut d'un véhicule (réservé au cycle contrat). *Reco : oui, sinon conflits de vérité.*

---

## 7. Fichiers critiques par l'implémentation

- `src/db/schema.ts` — toutes les nouvelles tables/enums + 5 modifications (source de vérité unique)
- `src/lib/rbac.ts` + `src/lib/auth.ts` + `src/components/layout/nav-config.ts` — rôle employee + 4 ressources
- `src/actions/contracts.ts` — extraction du chevauchement vers `src/lib/conflicts.ts` (nouveau) + `generateContractFromEvent`
- `src/actions/invoices.ts` — contractId nullable (innerJoin → leftJoin) + réutilisation machine à états
- `src/actions/planning.ts` + `src/components/planning/planning-calendar.tsx` — 3ᵉ type de barre (événements)
- `src/lib/number-utils.ts` — générateurs `EVT-`, `OFF-`
- Nouveaux : `src/actions/{fonctions,events,event-comments,quotes,billing,invoice-reminders,time-entries,tasks}.ts` + validations Zod, pages `/events`, `/quotes`, `/tasks`, `/time`, `/settings/fonctions`, routes PDF `quotes/[id]/pdf` et `invoices/[id]/pdf`
