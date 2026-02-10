# 9. Epic 4 — Inspections & Planning

> **Goal:** Digitaliser les états des lieux (départ/retour) avec photos, commentaires de dégâts et signature électronique. Fournir un planning visuel Gantt des réservations.

## Inspection — Deux phases de livraison

| Version | Scope | Sprint |
|---------|-------|--------|
| **MVP (V1.0)** | Formulaire simple : km, carburant, photos (upload libre), dégâts (zone + type + gravité + commentaire), signature | Sprint 6-7 |
| **Finale (V1.1)** | Formulaire structuré en 4 sections, photos par position (front/back/left/right), toggles propreté, sidebar "Departure State" sur le retour, notes agent | Sprint post-launch |

---

## User Stories — Inspections MVP (V1.0)

### US-4.1: Departure Inspection — MVP

**As an** agent
**I want** to create a departure inspection for a rental contract
**So that** the vehicle's condition at handover is documented

**Acceptance Criteria:**
```gherkin
Given I am on an active contract
When I click "État des lieux départ"
Then a form opens with:
  - Kilométrage de départ (number, required)
  - Niveau de carburant (gauge selector: E, 1/4, 1/2, 3/4, F)
  - Photos du véhicule (multiple upload, drag & drop)
  - Section dégâts existants (liste avec bouton "+ Ajouter un dégât")
  - Commentaires généraux (textarea)
  - Signature du client (signature pad)

Given I complete and save the inspection
When it is saved
Then the inspection is linked to the contract
And the departure date/time is recorded automatically
```

**Technical Notes:**
- Single scrollable form page
- Photos : upload libre (pas de slots prédéfinis), max 10 photos, max 10MB chacune
- Carburant : gauge visuel cliquable (5 positions)
- Stockage photos : Supabase Storage bucket `inspections`

---

### US-4.2: Return Inspection — MVP

**As an** agent
**I want** to create a return inspection for a rental contract
**So that** the vehicle's condition at return is documented and compared to departure

**Acceptance Criteria:**
```gherkin
Given I am closing a contract
When I click "État des lieux retour"
Then a form opens with the same fields as departure
And the departure inspection data is shown in a summary card above the form (km départ, carburant départ, nb dégâts existants)

Given I add a photo of a new damage with a comment
When I save
Then the damage is flagged as "Nouveau dégât" (not pre-existing)

Given the return inspection is complete
When I save with client signature
Then the inspection is linked to the contract
And I can proceed to close the contract
```

---

### US-4.3: Damage Documentation (Photos + Text) — MVP

**As an** agent
**I want** to document vehicle damages with photos and text descriptions
**So that** damage locations and severity are clearly recorded

**Acceptance Criteria:**
```gherkin
Given I am in an inspection form
When I click "+ Ajouter un dégât"
Then I can add:
  - Zone (dropdown: Avant, Arrière, Côté gauche, Côté droit, Toit, Intérieur)
  - Type (dropdown: Rayure, Bosse, Cassé, Tache, Autre)
  - Gravité (radio: Léger 🟢, Moyen 🟡, Grave 🔴)
  - Photo (optional upload)
  - Commentaire (textarea)

Given I add multiple damage entries
When I view the inspection
Then all damages are listed with their photos and descriptions

Given I view a return inspection
When damages from departure are shown
Then existing damages appear séparément des nouveaux dégâts
```

**Technical Notes:**
- Simple list of damage entries, each entry is a row
- Stored as related table `InspectionDamage` (not JSON)
- Severity displayed as 3 colored dots (green/amber/red), clickable

---

### US-4.4: Client Electronic Signature — MVP

**As an** agent
**I want** the client to sign the inspection on a tablet or screen
**So that** the inspection is legally binding

**Acceptance Criteria:**
```gherkin
Given the inspection form is completed
When the client section "Signature" is shown
Then a signature pad (touch-friendly canvas) is displayed

Given the client signs on the pad
When they confirm
Then the signature is saved as an image and attached to the inspection

Given the signature is saved
When the inspection PDF is generated
Then the signature appears on the document
```

**Technical Notes:**
- react-signature-canvas library
- Signature exported as PNG (base64)
- Stored in Supabase Storage, referenced in inspection record
- Checkbox "J'accepte le constat de dégâts et le kilométrage ci-dessus" required before saving

---

## User Stories — Inspections Finale (V1.1)

### US-4.5: Structured Inspection Form (4 Sections)

**As an** agent
**I want** a structured inspection form with clear sections
**So that** I don't miss any step during the inspection

**Acceptance Criteria:**
```gherkin
Given I open an inspection form (V1.1)
When the form loads
Then I see 4 numbered sections:
  1. Vehicle Vitals (km + carburant avec diff auto)
  2. General Condition (toggles propreté + photos par position)
  3. Reported Damages (table de dégâts)
  4. Validation (signature + notes agent)

Given this is a return inspection
When the form loads
Then a sticky sidebar "Departure State" is shown on the right with:
  - Departure km and fuel level
  - Pre-existing damages list with thumbnails
  - Link "View Full Departure Report"
  - Reminder notes from departure agent
```

---

### US-4.6: Structured Photo Upload (by Position)

**As an** agent
**I want** to upload photos organized by vehicle position
**So that** the photo documentation is systematic and consistent

**Acceptance Criteria:**
```gherkin
Given I am in section "2. General Condition"
When I see the photo upload area
Then I see 4 predefined slots: FRONT, BACK, Left Side, Right Side
And each slot shows a camera icon if empty, or a thumbnail if a photo is taken

Given I upload a photo in the "FRONT" slot
When the photo is saved
Then it shows as a thumbnail with a "FRONT" label overlay
```

---

### US-4.7: Cleanliness Toggles

**As an** agent
**I want** to quickly mark if the vehicle is clean or dirty (interior/exterior)
**So that** the general condition is recorded without long descriptions

**Acceptance Criteria:**
```gherkin
Given I am in section "2. General Condition"
When I see the cleanliness toggles
Then I see two toggle groups:
  - Exterior Cleanliness: [Clean | Dirty]
  - Interior Cleanliness: [Clean | Dirty]
```

---

### US-4.8: Before/After Comparison View

**As a** manager
**I want** to see a side-by-side comparison of departure vs. return inspection
**So that** I can quickly assess if any new damage occurred

**Acceptance Criteria:**
```gherkin
Given a contract has both departure and return inspections
When I open the comparison view
Then I see:
  - Departure photos ↔ Return photos (gallery slider)
  - Departure damages list ↔ Return damages list (side-by-side)
  - Km difference
  - Fuel level difference
  - New damages highlighted in red
```

---

### US-4.9: Inspection PDF Generation

**As an** agent
**I want** to generate a PDF of an inspection
**So that** I can archive it and share it with the client

**Acceptance Criteria:**
```gherkin
Given an inspection is completed
When I click "Générer PDF"
Then a PDF is created with:
  - Date and time
  - Vehicle info
  - Client info
  - Photos (thumbnails)
  - Liste des dégâts avec photos
  - Km and fuel level
  - Comments
  - Client signature
```

---

## User Stories — Planning

### US-4.10: Reservation Gantt Timeline (planby)

**As an** agent
**I want** to see all reservations on a Gantt timeline view
**So that** I can plan and manage vehicle availability visually

**Acceptance Criteria:**
```gherkin
Given I navigate to the Planning page
When the page loads
Then I see a horizontal Gantt timeline with:
  - Y-axis: vehicles (photo thumb + marque modèle + immat + status dot)
  - X-axis: days (scrollable, weekends highlighted in slate-50)
  - Colored bars representing contracts:
    - Blue (bg-blue-500): contrat actif
    - Grey (bg-slate-300): contrat terminé
    - Amber outline: pending confirmation
    - Violet outline: inquiry
  - Maintenance icon (wrench) on maintenance periods
  - Conflict/alert icon (❗ red) on scheduling conflicts
  - Vertical line for "today"

Given I hover on a reservation bar
When the popover opens
Then I see: client name, dates, remaining days, contract link

Given I click on a reservation bar
When it opens
Then I am navigated to the contract detail page
```

**Technical Notes:**
- Library: `planby` (React timeline component)
- Data source: Server Component fetching contracts + vehicles for the visible date range
- Filters passed as URL search params
- Vehicle sidebar: 200px fixed width

---

### US-4.11: Planning Filters & Navigation

**As an** agent
**I want** to filter and navigate the planning view
**So that** I can focus on specific vehicles or periods

**Acceptance Criteria:**
```gherkin
Given I am on the Planning page
When I see the controls
Then I have:
  - View toggle: Timeline | Monthly
  - Date navigation: < [Month Year] > + "Today" button
  - Filters: Category dropdown, Status dropdown, Branch dropdown (future SaaS)

Given I filter by category "Utilitaire"
When the filter applies
Then only utility vehicles are shown in the timeline

Given I click "Today"
When the view scrolls
Then today's column is centered and highlighted
```

---

### US-4.12: Availability Conflict Detection

**As an** agent
**I want** the system to automatically detect scheduling conflicts
**So that** I never double-book a vehicle

**Acceptance Criteria:**
```gherkin
Given vehicle "VD-123456" is booked from March 1 to March 5
When I try to create a new contract for the same vehicle from March 3 to March 8
Then I see an error "Conflit de disponibilité du 3 au 5 mars"

Given I am on the contract creation wizard
When I select a vehicle
Then only vehicles available for the selected dates are shown (or unavailable ones are greyed out with reason)
```

---

### US-4.13: Return Alerts — Today & Overdue

**As an** agent
**I want** to see alerts for vehicles due back today and overdue returns
**So that** I can follow up on late returns

**Acceptance Criteria:**
```gherkin
Given I am on the Dashboard or Planning page
When the page loads
Then I see:
  - "Retours aujourd'hui" with: véhicule/client, heure prévue, lieu, action "Faire le constat"
  - "Retours en retard" (red card) with: véhicule + immat, contrat #, client, "Dû [date heure]", "+Xh de retard", bouton téléphone

Given a contract is overdue
When I see the alert
Then I can click the phone icon to see the client's phone number
```
