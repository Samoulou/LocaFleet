# 8. Epic 3 — Clients & Contracts

> **Goal:** Gérer les fiches clients, créer des contrats de location complets, et générer automatiquement les documents PDF.

## User Stories — Clients

### US-3.1: Client List — DataTable with Search

**As an** agent
**I want** to see all clients in a searchable table
**So that** I can quickly find a client

**Acceptance Criteria:**
```gherkin
Given I navigate to the Clients page
When the page loads
Then I see a table with columns: Nom, Prénom, Téléphone, Email, Nb locations, Dernière location

Given I search for "Dupont"
When the results update
Then I see all clients matching "Dupont" in nom or prénom
```

---

### US-3.2: Create / Edit Client

**As an** agent
**I want** to create or edit a client profile
**So that** all client information is centralized

**Acceptance Criteria:**
```gherkin
Given I click "+ Nouveau client"
When I fill in: nom, prénom, date de naissance, adresse, téléphone, email
And I fill in permis: numéro, catégorie, date d'expiration
And I click "Enregistrer"
Then the client is created

Given I edit an existing client
When I update the phone number
Then the change is saved and visible on the client detail
```

**Fields:**
- Nom (string, required)
- Prénom (string, required)
- Date de naissance (date)
- Adresse complète (string)
- Téléphone (string, required)
- Email (string, required)
- Numéro de permis (string, required)
- Catégorie de permis (string)
- Date d'expiration du permis (date, required)
- Pièce d'identité (type + numéro)
- Notes internes (text)

---

### US-3.3: Client Document Upload

**As an** agent
**I want** to upload and store client documents (permis, ID, justificatif)
**So that** all required documents are accessible digitally

**Acceptance Criteria:**
```gherkin
Given I am on a client's detail page
When I click "Ajouter un document"
And I select a type (Permis de conduire, Pièce d'identité, Justificatif de domicile, Autre)
And I upload a file (JPEG, PNG, PDF, max 5MB)
Then the document is stored and visible on the client profile

Given I view a client's documents
When I click on a document
Then I can preview or download it
```

---

### US-3.4: Client Detail Page

**As a** user
**I want** a comprehensive client detail page
**So that** I see all client info, documents, and rental history

**Acceptance Criteria:**
```gherkin
Given I click on a client in the list
When the detail page loads
Then I see tabs: Informations, Documents, Historique des locations

Given I am on the "Historique" tab
When I view it
Then I see all past and current rentals: dates, véhicule, montant, statut
```

---

### US-3.5: Client Permis Expiration Alert

**As an** agent
**I want** to be warned if a client's driving license is expired or expiring soon
**So that** I don't rent to a client with an invalid license

**Acceptance Criteria:**
```gherkin
Given I am creating a contract for a client
When the client's permis expires within 30 days
Then I see a warning "Permis expirant le [date]"

Given the client's permis is already expired
When I try to create a contract
Then I see a blocking error "Permis expiré — location impossible"
```

---

## User Stories — Contracts

### US-3.6: Create Rental Contract — Wizard

**As an** agent
**I want** to create a rental contract step by step
**So that** the process is fast and error-free

**Acceptance Criteria:**
```gherkin
Given I click "+ Nouveau contrat"
When the wizard opens
Then I see steps:
  1. Sélection client (search + select)
  2. Sélection véhicule (only "Disponible" vehicles shown)
  3. Dates (départ + retour)
  4. Tarification + options
  5. Récapitulatif + confirmation

Given I select a vehicle that has a conflict on the chosen dates
When I try to continue
Then I see an error "Véhicule non disponible du [date] au [date]"

Given I complete all steps and click "Créer le contrat"
Then the contract is created with status "Actif"
And the vehicle status changes to "Loué"
```

---

### US-3.7: Contract Pricing Configuration

**As an** admin
**I want** to configure pricing rules (tarif jour, semaine, options)
**So that** contract amounts are calculated automatically

**Acceptance Criteria:**
```gherkin
Given I navigate to Settings > Tarification
When I set a daily rate of 80 CHF for category "SUV"
Then new contracts for SUVs use this rate by default

Given I create a contract for 5 days at 80 CHF/jour
And I add option "GPS" at 10 CHF/jour
When I see the summary
Then the total is (5 × 80) + (5 × 10) = 450 CHF
```

**Pricing structure:**
- Tarif journalier par catégorie
- Tarif hebdomadaire (réduction auto si > 7 jours)
- Km inclus par jour (franchise km)
- Surcharge par km supplémentaire
- Options additionnelles (GPS, siège bébé, assurance complémentaire, conducteur additionnel)
- Franchise dégâts

---

### US-3.8: Contract Detail Page

**As a** user
**I want** a full contract detail page
**So that** I can see all information, timeline, and associated documents

**Acceptance Criteria:**
```gherkin
Given I click on a contract in the list
When the detail page loads
Then I see:
  - Client info (nom, téléphone)
  - Vehicle info (marque, modèle, immatriculation)
  - Dates départ/retour
  - Tarification breakdown
  - Status (Brouillon / Actif / Terminé / Annulé)
  - Linked inspections (départ / retour)
  - Linked invoice
  - Actions: Modifier, Terminer, Générer PDF, Annuler
```

---

### US-3.9: Generate Contract PDF

**As an** agent
**I want** to generate a PDF contract document
**So that** the client can sign a formal rental agreement

**Acceptance Criteria:**
```gherkin
Given I am on a contract detail page
When I click "Générer PDF"
Then a PDF is generated with:
  - Company header and logo
  - Client information
  - Vehicle information
  - Dates and pricing breakdown
  - Conditions générales
  - Signature fields (locataire / loueur)

Given the PDF is generated
When I click "Télécharger"
Then the PDF downloads to my device
And the PDF is also stored in the system linked to the contract
```

---

### US-3.10: Contract Status Workflow

**As an** agent
**I want** to manage the lifecycle of a contract
**So that** the rental process is tracked from start to finish

**Acceptance Criteria:**
```gherkin
Given a contract is "Actif"
When I click "Terminer le contrat"
Then I am prompted to:
  1. Confirm return date and km
  2. Complete return inspection (link to Epic 4)
  3. Review final pricing (km supplémentaires, dégâts)
Then the contract status changes to "Terminé"
And the vehicle status changes to "Disponible"
And an invoice is created automatically

Given a contract is "Brouillon"
When I click "Annuler"
Then the contract status changes to "Annulé"
And the vehicle remains "Disponible"
```

**Status flow:**
```
Brouillon → Actif → Terminé → (Dossier archivé)
    │                              ↑
    └→ Annulé            (after quittancement)
```

---

### US-3.11: Contract List — Filterable Table

**As a** user
**I want** to see all contracts in a filterable table
**So that** I can manage ongoing and past rentals

**Acceptance Criteria:**
```gherkin
Given I navigate to the Contrats page
When the page loads
Then I see a table with: N° contrat, Client, Véhicule, Date départ, Date retour, Montant, Statut

Given I filter by status "Actif"
When the filter is applied
Then only active contracts are shown

Given I filter by date range
When I select "Ce mois"
Then only contracts starting this month are shown
```

---

### US-3.12: Extend or Modify Active Contract

**As an** agent
**I want** to extend a rental or change the vehicle mid-contract
**So that** I can accommodate client requests without creating a new contract

**Acceptance Criteria:**
```gherkin
Given a contract is "Actif"
When I click "Modifier"
Then I can:
  - Extend the return date (with availability check)
  - Add/remove options
  - Update the km allowance

Given I extend a contract by 3 days
When I save
Then the pricing is recalculated
And the planning is updated to reflect the new dates
```
