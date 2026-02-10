# 10. Epic 5 — Billing & Dashboard

> **Goal:** Mettre en place le workflow de facturation avec quittancement manuel, gestion des cautions, et un dashboard de pilotage de l'activité.

## User Stories — Facturation

### US-5.1: Invoice Auto-Generation on Contract Close

**As the** system
**I want** to automatically generate an invoice when a contract is terminated
**So that** the billing process starts immediately

**Acceptance Criteria:**
```gherkin
Given a contract is terminated (status → "Terminé")
When the contract closure is confirmed
Then an invoice is automatically created with:
  - Montant de base (durée × tarif journalier)
  - Options additionnelles
  - Km supplémentaires (if applicable)
  - Franchise dégâts (if new damages in return inspection)
  - Total TTC
  - Status: "En attente"
```

---

### US-5.2: Invoice List — Filterable Table

**As a** comptable/admin
**I want** to see all invoices in a filterable table
**So that** I can manage payments and follow up on outstanding amounts

**Acceptance Criteria:**
```gherkin
Given I navigate to the Facturation page
When the page loads
Then I see a table with: N° facture, Client, Véhicule, Montant, Statut, Date, Actions

Given I filter by status "En attente"
When the filter applies
Then only unpaid invoices are shown

Given I filter by period "Ce mois"
When the filter applies
Then only invoices from the current month are shown
```

**Invoice statuses:** En attente, Payé, Facturé (envoyé), Annulé

---

### US-5.3: Manual Receipt / Quittancement

**As an** admin
**I want** to manually mark an invoice as paid (quittancer)
**So that** the rental dossier can be archived

**Acceptance Criteria:**
```gherkin
Given an invoice has status "En attente" or "Facturé"
When I click "Quittancer"
Then I fill in:
  - Date du paiement
  - Moyen de paiement (Espèces, Carte, Virement)
  - Référence de paiement (optional)
  - Notes (optional)
And I confirm

Then the invoice status changes to "Payé"
And a payment record is created
And the associated rental dossier is moved to "Archivé"

Given an invoice is quittancée
When I view the dossier
Then it appears in the section "Dossiers archivés" with all linked documents
```

---

### US-5.4: Rental Dossier — Archive Workflow

**As an** admin
**I want** completed and paid rentals to be archived in a final dossier
**So that** I have a complete, auditable record of each rental

**Acceptance Criteria:**
```gherkin
Given a contract is terminated AND the invoice is quittancée
When the dossier is archived
Then the dossier contains:
  - Contrat (PDF)
  - État des lieux départ (PDF)
  - État des lieux retour (PDF)
  - Facture (PDF)
  - Preuve de paiement
  - Documents client associés

Given I search for an archived dossier
When I find it
Then I can view all documents but cannot modify the dossier (read-only)
```

**Dossier workflow:**
```
Contrat actif → Contrat terminé → Facture en attente → Quittancé → Dossier archivé
```

---

### US-5.5: Deposit (Caution) Management

**As an** agent
**I want** to manage the security deposit for each rental
**So that** cautions are tracked and refunded correctly

**Acceptance Criteria:**
```gherkin
Given I create a contract
When I set a caution amount (e.g., 1500 CHF)
Then the caution is recorded with status "Encaissée"

Given the contract is terminated without damages
When I close the dossier
Then I can mark the caution as "Restituée" with date

Given the contract is terminated with damages
When I close the dossier
Then I can mark a partial restitution (caution - franchise dégâts)
```

**Caution statuses:** En attente, Encaissée, Restituée, Partiellement restituée, Retenue

---

### US-5.6: Invoice PDF Generation

**As an** admin
**I want** to generate a PDF invoice
**So that** I can send it to the client

**Acceptance Criteria:**
```gherkin
Given I am on an invoice detail page
When I click "Générer PDF"
Then a PDF is created with:
  - Company header (name, address, contact)
  - Client information
  - Invoice number and date
  - Rental period and vehicle
  - Line items (tarif, options, km supplémentaires, franchise)
  - Total HT, TVA (if applicable), Total TTC
  - Payment instructions
```

---

---

## User Stories — Dashboard

### US-5.8: Dashboard — KPI Cards

**As a** manager
**I want** to see key business metrics at a glance
**So that** I can monitor the health of my rental business

**Acceptance Criteria:**
```gherkin
Given I am on the Dashboard page
When the page loads
Then I see KPI cards:
  - Taux d'occupation flotte: [X]% (graph sparkline)
  - CA du mois: [X] CHF
  - Contrats actifs: [X]
  - Véhicules disponibles: [X] / [Total]
  - Paiements en attente: [X] CHF
  - Retours aujourd'hui: [X]
```

---

### US-5.9: Dashboard — Revenue Chart

**As a** manager
**I want** to see a revenue chart over time
**So that** I can track revenue trends

**Acceptance Criteria:**
```gherkin
Given I am on the Dashboard
When I view the revenue chart
Then I see a bar/line chart showing:
  - CA par mois (default: 12 derniers mois)
  - Switchable: par semaine, par mois, par trimestre

Given I hover on a bar/point
When the tooltip shows
Then I see the exact amount and period
```

---

### US-5.10: Dashboard — Fleet Analytics

**As a** manager
**I want** to see which vehicles are most and least rented
**So that** I can optimize my fleet

**Acceptance Criteria:**
```gherkin
Given I am on the Dashboard
When I view the fleet analytics section
Then I see:
  - Top 5 véhicules les plus loués (bar chart)
  - Bottom 5 véhicules les moins loués (bar chart)
  - Taux d'occupation par catégorie (donut chart)
  - Revenue par catégorie (bar chart)
```
