# 6. Epic 1 — Foundation & Auth

> **Goal:** Mettre en place les fondations techniques du projet : authentification, rôles, layout principal, i18n, et structure multi-tenant ready.

## User Stories

### US-1.1: Project Setup & Configuration

**As a** developer
**I want** a fully configured Next.js 14+ project with all core dependencies
**So that** I can start building features on a solid foundation

**Acceptance Criteria:**
```gherkin
Given the project is cloned and dependencies installed
When I run `npm run dev`
Then the app starts on localhost:3000 with the base layout

Given Drizzle is configured
When I run `npx drizzle-kit push`
Then the database schema is applied to Supabase PostgreSQL

Given Tailwind and shadcn/ui are installed
When I import a component like <Button>
Then it renders correctly with the design system
```

**Technical Notes:**
- Next.js 15+ with App Router
- Drizzle ORM with Supabase connection string
- Tailwind CSS + shadcn/ui initialized
- ESLint + Prettier configured
- Folder structure: `app/[locale]/(dashboard)/...`

---

### US-1.2: Database Schema — Core Tables

**As a** developer
**I want** the core database tables created with tenant_id support
**So that** all features can build on a consistent data model

**Acceptance Criteria:**
```gherkin
Given the Drizzle schema is defined
When I run migrations
Then tables Tenant, User, Vehicle, Client, RentalContract, Invoice are created
And every business table has a tenant_id column with an index
```

**Technical Notes:**
- Tables: `tenants`, `users`, `vehicles`, `vehicle_categories`, `clients`, `rental_contracts`, `invoices`, `payments`
- All business tables include `tenant_id` (UUID, FK to tenants)
- Timestamps: `created_at`, `updated_at` on all tables
- Soft delete via `deleted_at` nullable timestamp

---

### US-1.3: Authentication — Login / Logout

**As a** user
**I want** to log in with my email and password
**So that** I can access the back-office securely

**Acceptance Criteria:**
```gherkin
Given I am on the login page
When I enter valid credentials
Then I am redirected to the dashboard

Given I am on the login page
When I enter invalid credentials
Then I see an error message "Email ou mot de passe incorrect"

Given I am logged in
When I click "Déconnexion"
Then I am logged out and redirected to the login page
```

**Technical Notes:**
- Better Auth with Credentials provider
- JWT session strategy
- Password hashed with bcrypt
- Login page at `/[locale]/login`

---

### US-1.4: Role-Based Access Control (RBAC)

**As an** admin
**I want** to assign roles to users (Admin, Agent, Viewer)
**So that** each user only sees and does what they're authorized to

**Acceptance Criteria:**
```gherkin
Given I am an Admin
When I access the settings page
Then I can see and manage all users and their roles

Given I am an Agent
When I try to access the facturation page
Then I can view invoices but cannot quittancer

Given I am a Viewer
When I try to create a new vehicle
Then I see an "Accès refusé" message
```

**Technical Notes:**
- Role enum: `ADMIN`, `AGENT`, `VIEWER`
- Middleware checks role on protected routes
- Server Actions validate role before mutations
- UI conditionally renders actions based on role

---

### US-1.5: Application Layout — Sidebar Navigation + Top Bar

**As a** user
**I want** a consistent navigation layout with a sidebar and a minimal top bar
**So that** I can quickly navigate between sections

**Acceptance Criteria:**
```gherkin
Given I am logged in
When the dashboard loads
Then I see a LEFT SIDEBAR with navigation items: Dashboard, Véhicules, Clients, Contrats, Planning, Dossiers, Maintenance, Settings
And I see user info (name + role) at the bottom of the sidebar
And I see a TOP BAR with search input (⌘K), notification bell, and user avatar
And there is NO horizontal navigation in the top bar (sidebar only)

Given the sidebar is expanded
When I click the collapse button
Then the sidebar shows icons only and the content area expands
```

**Technical Notes:**
- Navigation exclusively via sidebar (240px expanded, 64px collapsed)
- Top bar: search + notifications + user avatar only, NO nav links
- See section 3.2 of UI Design Goals for full specifications

---

### US-1.6: Internationalization (i18n) — FR / EN

**As a** user
**I want** to switch the interface language between French and English
**So that** the app is usable by francophone and anglophone users

**Acceptance Criteria:**
```gherkin
Given I am on any page in French
When I click the language switcher and select "English"
Then all interface labels switch to English
And the URL reflects the locale (/fr/... → /en/...)

Given I switch to English
When I navigate to another page
Then the language preference is maintained
```

**Technical Notes:**
- next-intl with App Router (`app/[locale]/...`)
- Translation files in `/messages/fr.json` and `/messages/en.json`
- Language preference stored in cookie
- Default locale: `fr`

---

### US-1.7: Seed Data — Initial Tenant & Admin User

**As a** developer
**I want** a seed script that creates the initial tenant and admin user
**So that** I can test the app immediately after setup

**Acceptance Criteria:**
```gherkin
Given I run `npx tsx src/db/seed.ts`
Then a default tenant "LocaFleet Demo" is created
And an admin user is created with email admin@locafleet.ch and a default password
And sample vehicle categories are created (Citadine, SUV, Utilitaire, Berline)
```

---

### US-1.8: Global Search

**As a** user
**I want** a search bar in the top bar that searches across vehicles, clients, and contracts
**So that** I can quickly find what I need

**Acceptance Criteria:**
```gherkin
Given I type "VD 123" in the search bar
When results appear
Then I see matching vehicles by immatriculation, clients by name, or contracts by ID

Given I click on a search result
When it's a vehicle
Then I am navigated to the vehicle detail page
```

**Technical Notes:**
- Command palette style (⌘K / Ctrl+K shortcut)
- Search via Drizzle ILIKE queries or PostgreSQL full-text search
- Debounced input (300ms)
