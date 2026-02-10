# 11. Epic 6 — Notifications & Email

> **Goal:** Mettre en place les notifications email transactionnelles : alertes maintenance vers le mécanicien, confirmation de réservation au client, et templates configurables.

## User Stories

### US-6.1: Email Service Setup (Resend + React Email)

**As a** developer
**I want** a configured email service with reusable templates
**So that** all transactional emails are consistent and maintainable

**Acceptance Criteria:**
```gherkin
Given Resend is configured with a verified domain
When I call the email service
Then emails are sent from "noreply@locafleet.ch" (or configured domain)

Given React Email templates exist
When I preview them in development
Then I can see the rendered email in the browser
```

**Technical Notes:**
- Resend as email provider
- React Email for template rendering
- Templates stored in `/emails/` directory
- Base template with company branding (logo, footer, colors)

---

### US-6.2: Maintenance Alert — Email to Mechanic

**As an** agent
**I want** the mechanic to receive an email when a maintenance entry is created
**So that** they are immediately informed of work to do

**Acceptance Criteria:**
```gherkin
Given I create a maintenance record for a vehicle
When I specify the mechanic's email and save
Then an email is sent to the mechanic with:
  - Subject: "Nouvelle demande de maintenance — [Marque Modèle] [Immatriculation]"
  - Vehicle details (marque, modèle, immatriculation, km)
  - Maintenance type and description
  - Urgency level (if specified)
  - Contact info of the sender

Given the email is sent
When I check the maintenance record
Then I see a status "Email envoyé le [date] à [email]"
```

**Email template:** `maintenance-request.tsx`

---

### US-6.3: Booking Confirmation — Email to Client

**As an** agent
**I want** a confirmation email sent to the client when a contract is created
**So that** the client has a written confirmation of their rental

**Acceptance Criteria:**
```gherkin
Given a contract is created with status "Actif"
When the contract is saved
Then an email is sent to the client with:
  - Subject: "Confirmation de réservation — [Marque Modèle]"
  - Client name
  - Vehicle details
  - Dates (départ et retour)
  - Pricing summary
  - Pick-up location and instructions
  - Company contact info

Given the email is sent
When I check the contract detail
Then I see "Confirmation envoyée le [date]"
```

**Email template:** `booking-confirmation.tsx`

---

### US-6.4: Email Log — History

**As an** admin
**I want** to see a log of all emails sent by the system
**So that** I can verify what was communicated and troubleshoot issues

**Acceptance Criteria:**
```gherkin
Given I navigate to Settings > Emails
When the page loads
Then I see a table with: Date, Destinataire, Sujet, Type (maintenance, confirmation), Statut (envoyé, erreur)

Given an email failed to send
When I see the error status
Then I can click "Renvoyer" to retry
```

---

### US-6.5: Configurable Email Templates (Settings)

**As an** admin
**I want** to customize the content of email templates
**So that** the messaging matches my company's tone

**Acceptance Criteria:**
```gherkin
Given I navigate to Settings > Templates email
When I select "Confirmation de réservation"
Then I see the template with editable fields:
  - Subject line
  - Greeting text
  - Footer text
  - Company logo

Given I modify the greeting text
When I save
Then future confirmation emails use the updated greeting
```

**Technical Notes:**
- Priority: Should (V1 uses hardcoded templates, V1.1 adds configuration)
- Templates stored in DB with fallback to code defaults
- Rich text editor (optional) or simple text fields

---

### US-6.6: In-App Notification Center

**As a** user
**I want** to see in-app notifications for important events
**So that** I don't miss critical actions

**Acceptance Criteria:**
```gherkin
Given a return is overdue
When I am logged in
Then I see a notification badge on the bell icon in the top bar

Given I click the notification bell
When the panel opens
Then I see a list of notifications:
  - "Retour en retard: [Client] — [Véhicule] (prévu le [date])"
  - "Maintenance terminée: [Véhicule]"
  - "Paiement reçu: Facture #[number]"

Given I click on a notification
When it opens
Then I am navigated to the relevant page (contract, vehicle, invoice)
And the notification is marked as read
```

**Technical Notes:**
- Priority: Should (V1 uses dashboard alerts, V1.1 adds notification center)
- Stored in DB table `notifications`
- No real-time push in V1 (polling or page reload)
