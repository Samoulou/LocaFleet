# 13. Next Steps

## MVP — Reste a faire

| US | Description | Effort est. | Dependances |
|----|-------------|-------------|-------------|
| MVP-4 | Email CG + page approbation publique | 5h | MVP-3 ✅ |
| MVP-5 | Generation digicode + notification | 3h | MVP-4 |

**Total estime restant : ~8h**

### Recemment completes (Sprint 4 & 5)

| US | Description | Statut |
|----|-------------|--------|
| MVP-7 | Constat de retour (photos tablette live) | ✅ Done |
| MVP-8 | Validation retour + archivage automatique | ✅ Done |
| MVP-9 | Page CRUD clients autonome (detail, documents, KPIs) | ✅ Done |
| MVP-10 | Capture photo tablette native + compression WebP | ✅ Done |
| MVP-11 | Page detail facture (getInvoiceById, updateInvoiceStatus) | ✅ Done |

## Post-MVP — Backlog

| Feature | Description | Effort est. |
|---------|-------------|-------------|
| Planning Gantt (planby) | Timeline horizontale par vehicule, detection conflits | 6-8h |
| Dashboard KPIs | Taux d'occupation, CA, alertes, charts Recharts | 4-6h |
| Notifications avancees | Alertes maintenance, rappels retour, templates configurables | 4-6h |
| Export PDF contrat | Generation PDF contrat avec @react-pdf/renderer | 4h |
| Inspection V1.1 | Formulaire structure 4 sections, photos par position, sidebar departure state | 6h |
| Export CSV | Export des listes (vehicules, clients, contrats, factures) | 3h |

## V2 — Portal Client (Online Booking)

| Feature | Description |
|---------|-------------|
| Portail de reservation en ligne | Le client peut voir les vehicules disponibles et reserver |
| Creation de compte client | Inscription, login, profil |
| Paiement en ligne | Integration Stripe Checkout pour paiement client |
| Confirmation et rappels automatiques | Workflow email complet |
| API publique | Endpoints REST via Hono pour integrations tierces |

## V3 — Multi-Tenant SaaS

| Feature | Description |
|---------|-------------|
| Onboarding tenant | Inscription d'un nouveau loueur avec wizard |
| Billing SaaS | Abonnement mensuel via Stripe Subscriptions |
| Sous-domaine par tenant | `mon-entreprise.locafleet.ch` |
| Admin panel super-admin | Gestion de tous les tenants |

## Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Volume de photos (constats multiples) | Medium | Compression WebP cote client, limiter a 10 photos/constat, Supabase image transforms |
| Performance PDF generation | Medium | Generer via Hono API Route en background |
| Camera compatibility tablettes | Low | `capture="environment"` est supporte par tous les navigateurs modernes, fallback vers selection fichier |
| Scope creep | High | MVP scope fixe, tout le reste va dans le backlog post-MVP |
