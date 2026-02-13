# 23. MVP Workflow — Flux Location Complet

> **Source de verite unique** pour le scope MVP. Les anciens fichiers Epic (6 a 11) ont ete supprimes.
> Pour le backlog post-MVP, voir [5-epic-list.md](./5-epic-list.md#phase-4--post-mvp-backlog).

---

## 1. Vue d'ensemble du flux

```
                     LISTE VÉHICULES
                           │
                     Clic sur véhicule
                           │
                 ┌─────────▼──────────┐
                 │  FORMULAIRE CONTRAT │ (style Google Calendar)
                 │  - Dates            │
                 │  - Client (auto)    │
                 │  - Tarif auto       │
                 │  - Options          │
                 │  - Mode paiement    │
                 └─────────┬──────────┘
                           │
                     Admin approuve
                           │
               ┌───────────▼───────────┐
               │  FACTURE AUTO-GÉNÉRÉE  │
               │  (basée sur tarif ×    │
               │   durée + options)     │
               └───────────┬───────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     Client connu ?              Client connu ?
        OUI ✓                       NON ✗
              │                         │
    ┌─────────▼─────────┐              │
    │  EMAIL AU CLIENT   │              │
    │  avec lien CG      │              │
    └─────────┬─────────┘              │
              │                         │
    ┌─────────▼─────────┐              │
    │  PAGE PUBLIQUE CG  │              │
    │  Client accepte    │              │
    └─────────┬─────────┘              │
              │                         │
    ┌─────────▼─────────┐              │
    │  DIGICODE GÉNÉRÉ   │              │
    │  Email au client   │              │
    │  Affiché à l'admin │              │
    └─────────┬─────────┘              │
              │                         │
              └────────────┬────────────┘
                           │
                 ┌─────────▼──────────┐
                 │  CONSTAT DE DÉPART  │
                 │  (photos, km,       │
                 │   dommages, sign.)  │
                 │  Modifiable admin   │
                 └─────────┬──────────┘
                           │
                     Location en cours
                           │
                 ┌─────────▼──────────┐
                 │  CONSTAT DE RETOUR  │
                 │  (photos, km,       │
                 │   dommages, sign.)  │
                 │  + SMS/email méca.  │
                 │    si remarques     │
                 └─────────┬──────────┘
                           │
                     Admin valide
                           │
                 ┌─────────▼──────────┐
                 │     ARCHIVAGE       │
                 │  Statut → completed │
                 │  Véhicule → dispo   │
                 └─────────────────────┘
```

---

## 2. Statuts du contrat

L'enum `contract_status` actuel (`draft`, `active`, `completed`, `cancelled`) ne suffit plus. Nouveau cycle de vie :

```
draft ──► approved ──┬──► pending_cg ──► active ──► completed
                     │                                  
                     └──► active ──────► completed      
                     
(n'importe quel état) ──► cancelled
```

| Statut | Signification | Déclenché par |
|--------|---------------|---------------|
| `draft` | Formulaire en cours de saisie | Clic sur véhicule |
| `approved` | Admin a validé, facture générée | Bouton "Approuver" |
| `pending_cg` | (client trusted) En attente approbation CG | Envoi email CG |
| `active` | Constat de départ validé, véhicule en location | Validation constat départ |
| `completed` | Constat de retour validé, archivé | Validation constat retour |
| `cancelled` | Annulé à n'importe quel moment | Bouton "Annuler" |

---

## 3. Modifications du schema

### 3.1 Enum mis à jour

```typescript
export const contractStatusEnum = pgEnum("contract_status", [
  "draft",
  "approved",
  "pending_cg",    // NEW — en attente CG client trusted
  "active",
  "completed",
  "cancelled",
]);
```

### 3.2 Table `clients` — nouveau champ

```typescript
// Ajouter dans la table clients :
isTrusted: boolean("is_trusted").default(false).notNull(),
```

Un client "trusted" (connu/régulier) passe par le flow CG + digicode. Les autres vont directement au constat de départ.

### 3.3 Table `rental_contracts` — nouveaux champs

```typescript
// Ajouter dans la table rentalContracts :

// Mode de paiement choisi à la création du contrat
paymentMethod: paymentMethodEnum("payment_method"),

// Flow CG (client trusted uniquement)
cgApprovalToken: uuid("cg_approval_token"),         // Token unique pour la page publique CG
cgApprovedAt: timestamp("cg_approved_at"),           // Quand le client a accepté les CG

// Digicode (client trusted uniquement)
digicode: varchar("digicode", { length: 10 }),       // Code PIN pour la boîte à clés
digicodeExpiresAt: timestamp("digicode_expires_at"), // Expiration du code

// Archivage
archivedAt: timestamp("archived_at"),                // Quand le contrat a été archivé
```

### 3.4 Index supplémentaire

```typescript
// Dans le bloc indexes de rentalContracts, ajouter :
index("contracts_cg_token_idx").on(table.cgApprovalToken),
```

### 3.5 Résumé des changements schema

| Table | Champ | Type | Raison |
|-------|-------|------|--------|
| `clients` | `is_trusted` | boolean, default false | Flag client de confiance |
| `rental_contracts` | `payment_method` | enum (cash/card/transfer) | Choisi à la création |
| `rental_contracts` | `cg_approval_token` | uuid nullable | Lien unique page CG |
| `rental_contracts` | `cg_approved_at` | timestamp nullable | Preuve acceptation CG |
| `rental_contracts` | `digicode` | varchar(10) nullable | Code PIN boîte à clés |
| `rental_contracts` | `digicode_expires_at` | timestamp nullable | Expiration digicode |
| `rental_contracts` | `archived_at` | timestamp nullable | Date d'archivage |
| enum `contract_status` | `pending_cg` | new value | Attente CG client trusted |

**Migration :** ces changements sont tous additifs (nouveaux champs nullable + nouvelle valeur d'enum) → backward-compatible, pas de risque.

---

## 4. User Stories MVP — Ordre d'implémentation

> Les Phases 1 (Foundation) et 2 (Fleet) sont completes.

### Sprint 3 — Contrat & Facturation

---

#### US-MVP-1 : Formulaire creation contrat depuis la fiche vehicule ✅ DONE

**As a** admin
**I want** to click a vehicle and create a rental contract
**So that** I can rent out a vehicle in a fast, streamlined flow

**Point d'entrée :** Bouton "Nouveau contrat" sur la page `/vehicles/[id]`. Ouvre un formulaire **drawer/panel** latéral (style Google Calendar, pas une page séparée).

**Champs du formulaire :**

| Champ | Type | Requis | Source |
|-------|------|--------|--------|
| Véhicule | Auto-rempli (readonly) | ✅ | URL |
| Catégorie + tarif journalier | Auto-rempli depuis le véhicule | ✅ | DB |
| Date début | DatePicker | ✅ | Saisie |
| Date fin | DatePicker | ✅ | Saisie |
| Nombre de jours | Calculé auto | ✅ | Calcul |
| Client | Autocomplete search | ✅ | US-MVP-2 |
| Client connu ? | Toggle (auto selon `isTrusted`) | ✅ | DB |
| Options (GPS, siège bébé...) | Checkboxes multi-select | ❌ | DB (`rental_options`) |
| Mode de paiement | Select (cash/carte/virement) | ✅ | Saisie |
| Km inclus/jour | Number (default depuis catégorie) | ❌ | DB/Saisie |
| Tarif km excédentaire | Number (CHF) | ❌ | Saisie |
| Caution | Number (CHF) | ❌ | Saisie |
| Lieu de prise en charge | Text | ❌ | Saisie |
| Lieu de retour | Text | ❌ | Saisie |
| Notes | Textarea | ❌ | Saisie |

**Calcul en temps réel (affiché en bas du form) :**
```
Tarif journalier :    CHF 75.00 × 5 jours = CHF 375.00
Options :             GPS (CHF 10/j × 5j) = CHF 50.00
                      ─────────────────────────────────
Montant total :                              CHF 425.00
Caution :                                    CHF 500.00
```

**Acceptance Criteria :**
```gherkin
Given I'm on a vehicle detail page
When I click "Nouveau contrat"
Then a side panel opens with the form pre-filled with vehicle info

Given I select dates
When dates are valid and vehicle is available
Then the total amount calculates in real-time

Given I fill all required fields
When I click "Créer brouillon"
Then a contract is created with status "draft"
And I see a summary with an "Approuver" button
```

**Effort :** 6h | **Priority :** 🔴

---

#### US-MVP-2 : Autocomplete client + modal creation rapide ✅ DONE

**As a** admin
**I want** to search for an existing client or create one on the fly
**So that** I don't have to leave the contract form to manage clients

**Comportement :**

1. **Autocomplete :** L'admin tape dans le champ client → recherche en temps réel par nom, prénom, email, téléphone. Résultats affichés en dropdown avec badge "Connu ✓" si `isTrusted`.

2. **Pas trouvé → "Nouveau client" :** Bouton en bas du dropdown ouvre un **modal** avec les champs minimum :

| Champ | Requis |
|-------|--------|
| Prénom | ✅ |
| Nom | ✅ |
| Téléphone | ✅ |
| Email | ✅ |
| N° permis | ❌ (mais recommandé) |
| Client de confiance | Toggle (default: off) |

Le modal crée le client et le sélectionne automatiquement dans le formulaire contrat.

**Acceptance Criteria :**
```gherkin
Given I type "Dup" in the client field
When there are clients matching "Dup"
Then I see a dropdown with matching clients (name, email, badge "Connu" if trusted)
And search is debounced 300ms

Given no client matches my search
When I click "Nouveau client"
Then a modal opens with the minimum fields
And after saving, the client is auto-selected in the form
And the "Client connu" toggle reflects the new client's isTrusted value
```

**Effort :** 4h | **Priority :** 🔴

---

#### US-MVP-3 : Approbation contrat + generation facture automatique ✅ DONE

**As a** admin
**I want** to approve a draft contract and have an invoice auto-generated
**So that** the billing is handled immediately without manual steps

**Flow :**

1. Contrat en `draft` → admin voit un résumé complet (client, véhicule, dates, montant, options)
2. Admin clique "Approuver le contrat"
3. **Automatiquement :**
   - Statut → `approved`
   - Facture créée dans la table `invoices` avec :
     - `invoiceNumber` auto-incrémenté (#INV-2026-001)
     - `lineItems` : tarif de base + chaque option sélectionnée
     - `subtotal`, `taxAmount`, `totalAmount`
     - `status` = `pending` (ou `paid` si paiement cash immédiat)
   - Véhicule → statut `rented`
   - Si client trusted : enchaîne sur US-MVP-4 (envoi email CG)
   - Si client non-trusted : statut reste `approved`, admin peut créer le constat de départ

**Acceptance Criteria :**
```gherkin
Given a contract is in "draft" status
When admin clicks "Approuver"
Then the contract status changes to "approved"
And an invoice is auto-generated with correct amounts
And the vehicle status changes to "rented"

Given the contract's client is trusted (isTrusted = true)
When the contract is approved
Then the status changes to "pending_cg"
And an email is sent to the client (US-MVP-4)

Given payment method is "cash"
When the invoice is created
Then invoice status is set to "paid" immediately
And a payment record is created with method "cash"
```

**Effort :** 4h | **Priority :** 🔴

---

#### US-MVP-4 : Email CG + page d'approbation publique (client trusted)

**As a** trusted client
**I want** to receive an email with a link to approve the rental terms
**So that** I can confirm the rental remotely before picking up the car

**Flow :**

1. À l'approbation du contrat (client trusted), le système :
   - Génère un `cgApprovalToken` (UUID unique)
   - Envoie un email via Resend avec un lien : `{APP_URL}/cg/approve/{token}`

2. Le client clique le lien → page publique (pas de login requis) :
   - Affiche les conditions générales (texte statique ou Markdown)
   - Résumé du contrat (véhicule, dates, montant)
   - Bouton "J'accepte les conditions générales"
   - Case à cocher : "J'ai lu et j'accepte"

3. Le client accepte :
   - `cgApprovedAt` = now()
   - `termsAccepted` = true
   - Enchaîne sur US-MVP-5 (digicode)

**Page publique `/cg/approve/[token]` :**
- Route Next.js **sans layout dashboard** (pas de sidebar, pas d'auth)
- Design épuré : logo LocaFleet + contenu CG + bouton
- Token invalide ou expiré → page d'erreur

**Acceptance Criteria :**
```gherkin
Given a contract is approved for a trusted client
When the system sends the CG email
Then the email contains a unique link with the cgApprovalToken
And the email shows the vehicle, dates, and amount

Given the client opens the CG link
When the token is valid
Then they see the terms & conditions and a contract summary
And they can click "J'accepte" after checking the checkbox

Given the client accepts the CG
When they click "J'accepte"
Then cgApprovedAt is set
And termsAccepted is set to true
And the digicode is generated (US-MVP-5)
```

**Effort :** 5h | **Priority :** 🔴

---

#### US-MVP-5 : Génération digicode + notification

**As a** admin
**I want** a digicode auto-generated when the client approves the CG
**So that** the client can pick up the keys from the physical key box

**Flow :**

1. Le client accepte les CG → le système :
   - Génère un code PIN à 4 chiffres (aléatoire, unique par contrat)
   - Stocke dans `digicode` + `digicodeExpiresAt` (= `endDate` du contrat + 24h)
   - Envoie un email au client avec le digicode
   - Affiche le digicode à l'admin dans la fiche contrat (avec un badge "CG approuvées ✓")

2. Le contrat passe en statut `approved` (les CG sont validées, le constat de départ peut commencer)

**Sécurité :**
- Le digicode est affiché uniquement aux admins/agents
- Le digicode expire automatiquement
- Un seul digicode actif par contrat (si re-généré, l'ancien est invalidé)

**Acceptance Criteria :**
```gherkin
Given the client has approved the CG
When cgApprovedAt is set
Then a 4-digit digicode is generated
And an email is sent to the client with the code
And the admin sees the digicode on the contract page
And the contract status changes to "approved" (CG done)

Given the contract end date has passed + 24h
Then the digicode is marked as expired
```

**Effort :** 3h | **Priority :** 🔴

---

### Sprint 4 — Inspections & Archivage

---

#### US-MVP-6 : Constat de depart (etat des lieux sortie) ✅ DONE

**As a** admin
**I want** to create a departure inspection for a contract
**So that** the vehicle's condition is documented before the rental starts

**Point d'entrée :** Bouton "Constat de départ" sur la fiche contrat (visible quand statut = `approved`).

**Formulaire :**

| Section | Champs |
|---------|--------|
| Infos véhicule | Kilométrage actuel, niveau carburant (jauge 5 niveaux) |
| Photos | Upload multiple (avant, arrière, côtés, intérieur) — compression WebP |
| Dommages existants | Ajout sur schéma véhicule (zone + type + sévérité + description + photo) |
| Propreté | Extérieur (propre/sale), intérieur (propre/sale) |
| Notes agent | Textarea libre |
| Signature client | Canvas signature (react-signature-canvas) — optionnel si client pas présent |

**Après validation :**
- Contrat → statut `active`
- `departureMileage` mis à jour sur le contrat
- Inspection créée avec `type = "departure"`, `isDraft = false`

**L'admin peut modifier le constat** après création (tant que le contrat est `active`).

**Acceptance Criteria :**
```gherkin
Given a contract is in "approved" status
When admin clicks "Constat de départ"
Then the inspection form opens pre-filled with vehicle info

Given I fill the mileage, upload photos, and mark existing damages
When I click "Valider le constat"
Then the inspection is saved
And the contract status changes to "active"
And the departure mileage is recorded on the contract

Given the contract is "active"
When admin opens the departure inspection
Then they can edit it (add photos, modify damages, update notes)
```

**Effort :** 6h | **Priority :** 🔴

---

#### US-MVP-7 : Constat de retour (état des lieux retour)

**As a** admin
**I want** to create a return inspection
**So that** the vehicle's condition at return is documented and new damages are identified

**Point d'entrée :** Bouton "Constat de retour" sur la fiche contrat (visible quand statut = `active`).

**Même formulaire que le départ, avec en plus :**

| Section supplémentaire | Champs |
|----------------------|--------|
| Comparaison | Dommages de départ affichés en read-only (pour comparer) |
| Nouveaux dommages | Marqués `isPreExisting = false` |
| Signature client | Obligatoire au retour |
| Remarques mécanicien | Textarea — si rempli, déclenche envoi au mécanicien |

**Acceptance Criteria :**
```gherkin
Given a contract is in "active" status
When admin clicks "Constat de retour"
Then the inspection form opens showing departure damages as read-only
And new damage fields are available for input

Given I fill the return inspection with return mileage and photos
When I click "Valider le constat"
Then the return inspection is saved
And the return mileage is recorded on the contract

Given the "remarques mécanicien" field is filled
When the inspection is validated
Then an email is sent to the mechanic (configured in tenant settings)
With the vehicle info, photos, and remarks
```

**Effort :** 5h | **Priority :** 🔴

---

#### US-MVP-8 : Validation retour + archivage automatique

**As a** admin
**I want** to validate the return inspection and auto-archive the contract
**So that** the rental is properly closed and the vehicle is available again

**Flow :**

1. Admin valide le constat de retour
2. **Automatiquement :**
   - Contrat → `completed`
   - `actualReturnDate` = now()
   - `archivedAt` = now()
   - Véhicule → `available`
   - Calcul des km excédentaires si applicable :
     - `excessKm = returnMileage - departureMileage - (includedKmPerDay × totalDays)`
     - Si `excessKm > 0` : `excessKmAmount = excessKm × excessKmRate`
     - Mise à jour du contrat + facture si excédent

3. Si des dommages sont constatés au retour (nouveaux, pas pré-existants) :
   - `damagesAmount` calculé (si politique de facturation configurée) ou saisi manuellement par l'admin
   - Facture mise à jour

**Acceptance Criteria :**
```gherkin
Given the return inspection is validated
When admin confirms
Then the contract status changes to "completed"
And archivedAt is set to now
And the vehicle status changes to "available"
And actualReturnDate is set

Given the return mileage exceeds the included km
When the excess is calculated
Then excessKmAmount is updated on the contract
And the invoice is updated with the excess km line item

Given new damages were found at return (isPreExisting = false)
When admin enters a damages amount
Then damagesAmount is updated on the contract
And the invoice is updated with a damages line item
```

**Effort :** 4h | **Priority :** 🔴

---

#### US-MVP-9 : Page CRUD clients autonome

**As a** admin
**I want** a dedicated clients page to manage all clients
**So that** I can view, edit, and flag clients as trusted outside of the contract flow

**Page `/clients` :**
- DataTable avec colonnes : Nom, Email, Téléphone, Permis, Trusted (badge), Nb contrats, Date création
- Recherche, tri, pagination (pattern PaginatedResult)
- Actions : Voir, Modifier, Toggle trusted, Soft delete

**Page `/clients/[id]` :**
- Fiche client complète
- Historique des contrats liés
- Documents (permis, ID) — upload
- Toggle "Client de confiance"

**Acceptance Criteria :**
```gherkin
Given I navigate to /clients
Then I see a paginated list of all clients for my tenant
And I can search by name, email, or phone
And I can sort by any column

Given I click on a client
Then I see their full profile with contract history
And I can toggle the "trusted" flag
And I can upload/view their documents (license, ID)
```

**Effort :** 5h | **Priority :** 🟡 (peut venir après le flow contrat, le modal US-MVP-2 suffit pour le MVP)

---

## 5. Résumé Sprint Planning

### Sprint 3 — Contrat & Facturation ✅ COMPLETE

| US | Description | Statut |
|----|-------------|--------|
| MVP-1 | Form contrat depuis vehicule | ✅ Done |
| MVP-2 | Autocomplete client + modal | ✅ Done |
| MVP-3 | Approbation + facture auto | ✅ Done |
| MVP-4 | Email CG + page publique | ❌ A faire |
| MVP-5 | Digicode + notification | ❌ A faire |

### Sprint 4 — Inspections & Archivage 🔄 EN COURS

| US | Description | Statut |
|----|-------------|--------|
| MVP-6 | Constat de depart | ✅ Done |
| MVP-7 | Constat de retour | ❌ A faire |
| MVP-8 | Validation retour + archivage | ❌ A faire |

### Sprint 5 — Clients & Polish

| US | Description | Statut |
|----|-------------|--------|
| MVP-9 | Page CRUD clients | ❌ A faire |

---

## 6. Notes

- Les anciens fichiers Epic (6 a 11) ont ete supprimes. Ce document est la **source de verite unique** pour le scope MVP.
- Les features post-MVP (planning, dashboard KPIs, notifications avancees) sont listees dans [5-epic-list.md](./5-epic-list.md#phase-4--post-mvp-backlog).
- Les guides techniques (securite, performance, ops, tests) s'appliquent tels quels. Toutes les regles (tenantId, audit, rate limiting, pagination, logging) restent valides.

---

## 7. Routes Next.js MVP

```
/vehicles                          # ✅ EXISTE (Epic 2)
/vehicles/[id]                     # ✅ EXISTE (Epic 2) — ajouter bouton "Nouveau contrat"
/vehicles/[id]/new-contract        # Ou panel/drawer sur /vehicles/[id]
/contracts                         # Liste des contrats avec filtres par statut
/contracts/[id]                    # Fiche contrat (résumé, approbation, inspections)
/contracts/[id]/inspection/departure  # Formulaire constat de départ
/contracts/[id]/inspection/return     # Formulaire constat de retour
/clients                           # Liste clients (US-MVP-9)
/clients/[id]                      # Fiche client
/cg/approve/[token]                # 🌐 PAGE PUBLIQUE (pas de layout dashboard, pas d'auth)
```

---

## 8. Dépendances techniques

```bash
# Déjà installé (Epic 1-2)
resend                    # Envoi d'emails
react-signature-canvas    # Signature client
sonner                    # Toast notifications
zod                       # Validation
browser-image-compression # Compression photos

# Potentiellement nécessaire
@react-email/components   # Templates email HTML pour CG et digicode
```

---

## 9. Règles métier importantes

1. **Un véhicule ne peut avoir qu'un seul contrat actif à la fois.** Vérifier à l'approbation qu'il n'y a pas de chevauchement de dates.

2. **Le digicode est un PIN à 4 chiffres**, unique par contrat actif, qui expire `endDate + 24h`.

3. **La facture est immutable après création**, sauf pour les ajouts post-retour (km excédentaires, dommages). Ces ajouts sont des line items supplémentaires.

4. **Le constat de départ est modifiable** tant que le contrat est `active`. Le constat de retour est modifiable tant qu'il n'est pas validé (archivage).

5. **L'email au mécanicien** ne se déclenche que si le champ "remarques mécanicien" du constat de retour est rempli. L'adresse email du mécanicien est configurée dans les settings du tenant.

6. **Format suisse :** montants en CHF avec apostrophe (1'250.00), dates en DD.MM.YYYY.
