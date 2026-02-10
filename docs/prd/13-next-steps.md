# 13. Next Steps

## Immediate Actions (Pre-Sprint 1) — Bloquants

1. **Écrire le schéma Drizzle complet** — Toutes les tables, relations, enums, indexes
2. **Créer les comptes** — Supabase, Railway, Resend, GitHub repo
3. **Créer le repo GitHub** — avec structure Next.js 15 + App Router
4. **Initialiser le projet** — Next.js 15 + shadcn/ui + Tailwind + Drizzle + Better Auth
5. **Configurer CI/CD** — GitHub Actions → Railway auto-deploy
6. **Setup Sentry** — Error tracking dès le premier jour
7. **Décider du nom définitif** — "LocaFleet" est un placeholder

## V1.0 Delivery — Sprints 1-11

| Sprint | Epic | Deliverable |
|--------|------|-------------|
| 1-2 | Epic 1 — Foundation | Auth, layout sidebar, i18n, seed data |
| 2-4 | Epic 2 — Fleet | Véhicules CRUD, catégories, maintenance, photos |
| 4-6 | Epic 3 — Clients & Contracts | Clients, wizard contrat, PDF, tarification |
| 6-8 | Epic 4 — Inspections (MVP) & Planning | Constats simples, Gantt planby, conflits dispo |
| 8-10 | Epic 5 — Billing & Dashboard | Dossiers, quittancement, KPIs, charts |
| 10-11 | Epic 6 — Notifications | Email mécanicien, confirmation client |

## V1.1 — Quick Wins Post-Launch

| Feature | Description | Effort |
|---------|-------------|--------|
| Inspection V1.1 | Formulaire structuré 4 sections, photos par position, sidebar departure state | M |
| Templates email configurables | Admin peut modifier les textes des emails | S |
| Centre de notifications in-app | Bell icon + liste de notifications | M |
| Export CSV | Export des listes (véhicules, clients, contrats, factures) | S |
| Dark mode | Toggle dark/light theme | S |
| Audit log viewer | Interface pour consulter les logs d'audit | M |

## V2 — Portal Client (Online Booking)

> Transformation du back-office en plateforme avec un front-end client.

| Feature | Description |
|---------|-------------|
| Portail de réservation en ligne | Le client peut voir les véhicules disponibles et réserver |
| Création de compte client | Inscription, login, profil |
| Paiement en ligne | Intégration Stripe Checkout pour paiement client |
| Confirmation et rappels automatiques | Workflow email complet |
| Évaluation post-location | Le client peut laisser un avis |
| API publique | Endpoints REST via Hono (déjà préparé) pour intégrations tierces |

## V3 — Multi-Tenant SaaS

> Ouvrir la plateforme à d'autres loueurs indépendants.

| Feature | Description |
|---------|-------------|
| Onboarding tenant | Inscription d'un nouveau loueur avec wizard |
| Billing SaaS | Abonnement mensuel via Stripe Subscriptions |
| Sous-domaine par tenant | `mon-entreprise.locafleet.ch` |
| Admin panel super-admin | Gestion de tous les tenants |
| Personnalisation branding | Logo, couleurs, nom par tenant |
| Migration hosting | Évaluer Coolify + Infomaniak pour données en Suisse |

## Technical Debt to Address

| Item | Priority | When |
|------|----------|------|
| Tests E2E (Playwright) | High | Post V1 launch |
| Optimiser les requêtes complexes (Drizzle joins) | Medium | Ongoing |
| CDN pour les images | Medium | V1.1 |
| Documentation API (Hono endpoints) | Low | V2 |

## Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Volume de photos (constats multiples) | Medium | Compression côté client, limiter à 10 photos/constat, Supabase image transforms |
| Performance PDF generation (gros contrats) | Medium | Générer via Hono API Route en background, pas en Server Action |
| Adoption par l'équipe de V1ls | High | Impliquer V1ls dès le sprint 2, feedback loops courts, valider les maquettes |
| Scope creep | High | Strict priorisation Must/Should, inspection en 2 phases |
| Conformité RGPD (données clients) | Medium | Privacy by design, soft delete, droit à l'effacement implémenté dès V1 |
| planby limitations | Low | Si planby ne suffit pas, fallback sur custom CSS Grid + date-fns |
