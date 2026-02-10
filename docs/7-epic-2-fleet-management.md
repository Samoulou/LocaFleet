# 7. Epic 2 — Fleet Management

> **Goal:** Permettre la gestion complète de la flotte de véhicules : catalogue, catégories, statuts, photos, et historique de maintenance.

## User Stories

### US-2.1: Vehicle List — DataTable with Filters

**As an** agent
**I want** to see all vehicles in a filterable, sortable table
**So that** I can quickly find and manage vehicles

**Acceptance Criteria:**
```gherkin
Given I navigate to the Véhicules page
When the page loads
Then I see a table with columns: Photo, Marque/Modèle, Immatriculation, Catégorie, Km, Statut, Actions

Given I filter by category "SUV"
When the filter is applied
Then only SUV vehicles are shown

Given I filter by status "Disponible"
When the filter is applied
Then only available vehicles are shown

Given there are more than 20 vehicles
When I scroll or paginate
Then the next batch of vehicles loads
```

**Technical Notes:**
- Server-side pagination and filtering via URL search params
- TanStack Table or shadcn DataTable
- Status badge colors: 🟢 Disponible, 🟣 Loué, 🟠 Maintenance, 🔴 Hors service

---

### US-2.2: Create / Edit Vehicle

**As an** admin or agent
**I want** to create or edit a vehicle with all its details
**So that** the fleet catalog stays up to date

**Acceptance Criteria:**
```gherkin
Given I click "+ Nouveau véhicule"
When I fill in marque, modèle, immatriculation, kilométrage, catégorie
And I click "Enregistrer"
Then the vehicle is created and appears in the list

Given I edit an existing vehicle
When I change the kilométrage
And I click "Enregistrer"
Then the updated value is reflected in the vehicle detail

Given I try to create a vehicle with an existing immatriculation
When I submit
Then I see an error "Ce numéro d'immatriculation existe déjà"
```

**Fields:**
- Marque (string, required)
- Modèle (string, required)
- Immatriculation (string, required, unique per tenant)
- Kilométrage (number, required)
- Année (number)
- Couleur (string)
- Numéro de châssis / VIN (string)
- Catégorie (FK, required)
- Carburant (enum: Essence, Diesel, Électrique, Hybride)
- Transmission (enum: Manuelle, Automatique)
- Nombre de places (number)
- Notes internes (text)

---

### US-2.3: Vehicle Photo Gallery

**As an** agent
**I want** to upload and manage multiple photos for each vehicle
**So that** the vehicle's visual condition is documented

**Acceptance Criteria:**
```gherkin
Given I am on a vehicle's detail page
When I click "Ajouter des photos"
Then I can upload multiple images (JPEG, PNG, WebP, max 10MB each)

Given photos are uploaded
When I view the vehicle detail
Then I see a gallery of all photos with the ability to set a cover photo

Given I want to remove a photo
When I click the delete icon on a photo
Then the photo is removed after confirmation
```

---

### US-2.4: Vehicle Categories (CRUD)

**As an** admin
**I want** to manage vehicle categories
**So that** vehicles can be organized and filtered by type

**Acceptance Criteria:**
```gherkin
Given I navigate to Settings > Catégories
When the page loads
Then I see the list of categories with vehicle count per category

Given I create a new category "Cabriolet"
When I save
Then the category is available in the vehicle creation form

Given I try to delete a category with assigned vehicles
When I click delete
Then I see a warning "X véhicules utilisent cette catégorie"
```

**Default categories:** Citadine, Berline, SUV, Utilitaire, Monospace, Cabriolet

---

### US-2.5: Vehicle Status Management

**As an** agent
**I want** to change a vehicle's status quickly
**So that** the fleet availability is always accurate

**Acceptance Criteria:**
```gherkin
Given a vehicle is "Disponible"
When I change its status to "En maintenance"
Then the vehicle is no longer available for new contracts
And a maintenance record can be created

Given a vehicle is "Loué"
When I try to change its status manually
Then I see a warning "Ce véhicule a un contrat actif. Terminez le contrat d'abord."

Given a vehicle status changes
When I check the vehicle's activity log
Then I see the status change with timestamp and user
```

---

### US-2.6: Vehicle Detail Page

**As a** user
**I want** a comprehensive detail page for each vehicle
**So that** I can see all information, history, and actions in one place

**Acceptance Criteria:**
```gherkin
Given I click on a vehicle in the list
When the detail page loads
Then I see tabs: Informations, Photos, Locations, Maintenance

Given I am on the "Locations" tab
When I view it
Then I see the history of all rentals for this vehicle (dates, client, montant)

Given I am on the "Maintenance" tab
When I view it
Then I see the full maintenance history with dates, descriptions, and costs
```

---

### US-2.7: Maintenance Record — Create

**As an** agent
**I want** to log a maintenance entry for a vehicle
**So that** the maintenance history is tracked and the mechanic is notified

**Acceptance Criteria:**
```gherkin
Given I am on a vehicle's maintenance tab
When I click "+ Nouvelle maintenance"
And I fill in: type (entretien, réparation, contrôle technique), description, date, coût estimé, mécanicien (email)
And I click "Enregistrer"
Then the maintenance record is created
And the vehicle status changes to "En maintenance"

Given the maintenance is created with a mechanic email
When it is saved
Then an email is sent to the mechanic with vehicle details and description
```

**Technical Notes:**
- Maintenance types: Entretien courant, Réparation, Contrôle technique, Pneus, Autre
- Link to Epic 6 (notifications) for email sending

---

### US-2.8: Maintenance Record — Close

**As an** agent
**I want** to close a maintenance record when the work is done
**So that** the vehicle becomes available again

**Acceptance Criteria:**
```gherkin
Given a vehicle is "En maintenance" with an open maintenance record
When I click "Clôturer la maintenance"
And I fill in: date de fin, coût final, notes
Then the maintenance record is closed
And the vehicle status changes back to "Disponible"
```

---

### US-2.9: Vehicle Import (CSV)

**As an** admin
**I want** to import vehicles from a CSV file
**So that** I can onboard the existing fleet quickly

**Acceptance Criteria:**
```gherkin
Given I click "Importer CSV"
When I upload a CSV with columns: marque, modèle, immatriculation, catégorie, km
Then the system validates each row
And shows a preview with errors highlighted (e.g., duplicate immatriculation)

Given the preview is validated
When I click "Importer"
Then all valid vehicles are created
And a summary shows "X importés, Y erreurs"
```

---

### US-2.10: Vehicle KPI Cards (Fleet Overview)

**As a** manager
**I want** to see key fleet metrics at the top of the vehicles page
**So that** I have a quick overview of fleet health

**Acceptance Criteria:**
```gherkin
Given I am on the Véhicules page
When the page loads
Then I see KPI cards:
  - Total véhicules: [count]
  - Disponibles: [count] (green)
  - En location: [count] (purple)
  - En maintenance: [count] (amber)
```
