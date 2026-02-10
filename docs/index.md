# LocaFleet — Product Requirements Document (PRD)

> **Version:** 1.2.0
> **Last updated:** 2026-02-08
> **Author:** Sam
> **Status:** Draft

---

## Table of Contents

| # | Document | Description |
|---|----------|-------------|
| 1 | [Goals & Background Context](./1-goals-and-background-context.md) | Vision, problem statement, target users, success metrics |
| 2 | [Requirements](./2-requirements.md) | Functional & non-functional requirements |
| 3 | [User Interface Design Goals](./3-user-interface-design-goals.md) | UI/UX principles, layout, design system |
| 4 | [Technical Assumptions](./4-technical-assumptions.md) | Stack, architecture, infrastructure decisions |
| 5 | [Epic List](./5-epic-list.md) | Overview of all epics and delivery phases |
| 0 | [**Sprint 0 — Setup & Pré-requis**](./6b-sprint-0-setup.md) | **Tâches bloquantes et nice-to-have avant le dev** |
| 6 | [Epic 1 — Foundation & Auth](./6-epic-1-foundation-auth.md) | Authentication, tenant structure, i18n setup |
| 7 | [Epic 2 — Fleet Management](./7-epic-2-fleet-management.md) | Vehicle catalog, categories, statuses, maintenance |
| 8 | [Epic 3 — Clients & Contracts](./8-epic-3-clients-contracts.md) | Client profiles, rental contracts, PDF generation |
| 9 | [Epic 4 — Inspections & Planning](./9-epic-4-inspections-planning.md) | Vehicle inspections, calendar, availability |
| 10 | [Epic 5 — Billing & Dashboard](./10-epic-5-billing-dashboard.md) | Invoicing, payments, analytics dashboard |
| 11 | [Epic 6 — Notifications & Email](./11-epic-6-notifications-email.md) | Email workflows, maintenance alerts, confirmations |
| 12 | [Checklist & Results Report](./12-checklist-results-report.md) | PRD quality checklist |
| 13 | [Next Steps](./13-next-steps.md) | Roadmap, V2 considerations, SaaS evolution |
| — | [Change Log](./change-log.md) | Version history |
| — | [Schema Drizzle](./schema.ts) | Schéma complet de la base de données (21 tables) |
| — | [**Claude Code Setup Guide**](./14-claude-code-setup-guide.md) | Skills, orchestrateur, CLAUDE.md, best practices |
| — | [**Stratégie de Tests**](./15-testing-strategy.md) | Vitest (unit), Playwright (E2E), patterns, CI/CD |
| — | [**Workflow Dev d'une US**](./16-workflow-developpement-us.md) | Étape par étape du premier prompt au push |
| — | [**Orchestration Avancée**](./17-claude-code-advanced-orchestration.md) | Subagents, Tasks, hooks block-at-commit, compound engineering |
| — | [**Sécurité & Compliance**](./18-security-compliance.md) | Rate limiting, RLS, nLPD, audit trail, migrations, headers |
| — | [**Performance & Scalabilité**](./19-performance-scalability.md) | Caching, pagination, storage, compression, Error Boundaries |
| — | [**Opérations & Observabilité**](./20-ops-observability.md) | Logging structuré, health check, métriques, export, rollback |
| — | [**Navigation PRD pour Claude**](./21-prd-navigation-strategy.md) | 3 couches de context, routing table, chargement sélectif |
| — | [**🚀 Flow de Développement**](./22-development-flow-summary.md) | Le one-pager à garder ouvert pendant tout le dev |
